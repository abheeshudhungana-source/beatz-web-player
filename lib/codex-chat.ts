import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface CodexReply {
  text: string;
  action: 'none' | 'queue' | 'play';
  query: string;
  numberOfTracks: number;
}

const CODEX_FAILURES = {
  unavailable: { status: 503, message: 'Codex CLI was not found. Install it or check CODEX_BIN, then restart Beatz.' },
  auth: { status: 503, message: 'Codex reported an authentication failure. Run codex login in your terminal, then retry.' },
  timeout: { status: 504, message: 'Codex did not reply within 60 seconds. Please try again.' },
  cancelled: { status: 499, message: 'The Codex request was cancelled.' },
  invalid_output: { status: 502, message: 'Codex returned an invalid music response. Please try again.' },
  rate_limit: { status: 429, message: 'Codex reported a usage or rate limit. Wait before retrying or check your account usage.' },
  failed: { status: 503, message: 'Codex could not complete this request. Try again; if it persists, check the CLI in your terminal.' },
} as const;

type CodexFailureCode = keyof typeof CODEX_FAILURES;

export class CodexChatError extends Error {
  readonly code: CodexFailureCode;

  constructor(code: CodexFailureCode) {
    super(CODEX_FAILURES[code].message);
    this.name = 'CodexChatError';
    this.code = code;
  }
}

export function classifyCodexFailure(error: unknown, stderr = '', aborted = false): CodexChatError {
  const failure = (typeof error === 'object' && error !== null ? error : {}) as {
    name?: string; code?: string | number; killed?: boolean; signal?: string;
  };
  if (aborted || failure.name === 'AbortError') return new CodexChatError('cancelled');
  if (failure.code === 'ENOENT') return new CodexChatError('unavailable');
  if (failure.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') return new CodexChatError('invalid_output');
  if (failure.killed && failure.signal === 'SIGKILL') return new CodexChatError('timeout');
  // Classify known CLI diagnostics in memory; never return or log raw diagnostics.
  if (/\b429\b|rate.?limit|quota|usage limit/i.test(stderr)) return new CodexChatError('rate_limit');
  if (/\b401\b|unauthorized|not (?:logged|signed) in|authentication (?:failed|required)|(?:expired|invalid) (?:access |refresh )?token/i.test(stderr)) {
    return new CodexChatError('auth');
  }
  return new CodexChatError('failed');
}

export function codexErrorResponse(error: unknown) {
  const failure = error instanceof CodexChatError ? error : new CodexChatError('failed');
  return {
    status: CODEX_FAILURES[failure.code].status,
    body: { error: failure.message, code: `codex_${failure.code}` },
  };
}

const replySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'action', 'query', 'numberOfTracks'],
  properties: {
    text: { type: 'string' },
    action: { type: 'string', enum: ['none', 'queue', 'play'] },
    query: { type: 'string' },
    numberOfTracks: { type: 'integer', minimum: 1, maximum: 5 },
  },
};

interface RunOptions {
  cwd: string;
  signal?: AbortSignal;
}

type Runner = (args: string[], prompt: string, options: RunOptions) => Promise<string>;

const execute: Runner = (args, prompt, { cwd, signal }) => new Promise((resolve, reject) => {
  // Let Codex use its own login; do not forward Beatz's Spotify credentials.
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV };
  for (const name of ['PATH', 'HOME', 'USER', 'LOGNAME', 'TMPDIR', 'TEMP', 'TMP', 'SYSTEMROOT', 'APPDATA', 'LOCALAPPDATA', 'CODEX_HOME']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  const child = execFile(process.env.CODEX_BIN || 'codex', args, {
    cwd, env, signal, timeout: 60_000, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024,
  }, (error, stdout, stderr) => {
    // Never surface stderr, which may include account or provider details.
    if (error) reject(classifyCodexFailure(error, stderr, signal?.aborted));
    else resolve(stdout);
  });
  child.stdin?.on('error', () => {});
  child.stdin?.end(prompt);
});

export function parseCodexReply(output: string): CodexReply {
  let reply: Partial<CodexReply> | null;
  try {
    reply = JSON.parse(output) as Partial<CodexReply> | null;
  } catch {
    throw new CodexChatError('invalid_output');
  }
  if (!reply || typeof reply.text !== 'string' || !reply.text.trim() || reply.text.length > 4000 ||
      !['none', 'queue', 'play'].includes(reply.action || '') ||
      typeof reply.query !== 'string' || reply.query.length > 80 ||
      !Number.isInteger(reply.numberOfTracks) || reply.numberOfTracks! < 1 || reply.numberOfTracks! > 5 ||
      (reply.action !== 'none' && !reply.query.trim())) {
    throw new CodexChatError('invalid_output');
  }
  return reply as CodexReply;
}

export async function askCodex(prompt: string, signal?: AbortSignal, run: Runner = execute): Promise<CodexReply> {
  if (signal?.aborted) throw new CodexChatError('cancelled');
  const directory = await mkdtemp(join(tmpdir(), 'beatz-chat-'));
  try {
    const schemaPath = join(directory, 'reply.schema.json');
    await writeFile(schemaPath, JSON.stringify(replySchema), { mode: 0o600 });
    const args = [
      'exec', '--ignore-user-config', '--ignore-rules', '--ephemeral',
      '--skip-git-repo-check', '--sandbox', 'read-only',
      '--disable', 'shell_tool', '--disable', 'apps', '--disable', 'hooks',
      '--disable', 'browser_use', '--disable', 'computer_use', '--disable', 'in_app_browser',
      '-c', 'web_search="disabled"', '-c', 'project_doc_max_bytes=0',
      '--output-schema', schemaPath, '--color', 'never',
    ];
    if (process.env.CODEX_MODEL) args.push('--model', process.env.CODEX_MODEL);
    args.push('-'); // Prompt travels on stdin, never through a shell or command-line argument.
    return parseCodexReply(await run(args, prompt, { cwd: directory, signal }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
