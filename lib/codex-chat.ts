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
  }, (error, stdout) => {
    // Never surface stderr, which may include account or provider details.
    if (error) reject(new Error('Codex could not reply. Check that the current Codex CLI is installed and run codex login in your terminal.'));
    else resolve(stdout);
  });
  child.stdin?.on('error', () => {});
  child.stdin?.end(prompt);
});

export function parseCodexReply(output: string): CodexReply {
  const reply = JSON.parse(output) as Partial<CodexReply> | null;
  if (!reply || typeof reply.text !== 'string' || !reply.text.trim() || reply.text.length > 4000 ||
      !['none', 'queue', 'play'].includes(reply.action || '') ||
      typeof reply.query !== 'string' || reply.query.length > 80 ||
      !Number.isInteger(reply.numberOfTracks) || reply.numberOfTracks! < 1 || reply.numberOfTracks! > 5 ||
      (reply.action !== 'none' && !reply.query.trim())) {
    throw new Error('Codex returned an invalid music response. Please try again.');
  }
  return reply as CodexReply;
}

export async function askCodex(prompt: string, signal?: AbortSignal, run: Runner = execute): Promise<CodexReply> {
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
