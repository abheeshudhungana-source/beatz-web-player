import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { askCodex, parseCodexReply } from '../lib/codex-chat.ts';

const reply = { text: 'Here is a selection to try.', action: 'queue', query: 'acoustic folk', numberOfTracks: 3 };

test('accepts conversation, queue, and play responses', () => {
  for (const action of ['none', 'queue', 'play']) {
    const value = { ...reply, action, query: action === 'none' ? '' : reply.query };
    assert.deepEqual(parseCodexReply(JSON.stringify(value)), value);
  }
});

test('rejects malformed or unsafe actions before Spotify can run', () => {
  for (const value of [null, {}, { ...reply, action: 'shell' }, { ...reply, query: {} },
    { ...reply, query: '' }, { ...reply, query: 'x'.repeat(81) },
    { ...reply, text: '' }, { ...reply, text: 'x'.repeat(4001) },
    ...[0, 6, 1.5, '3'].map(numberOfTracks => ({ ...reply, numberOfTracks }))]) {
    assert.throws(() => parseCodexReply(JSON.stringify(value)));
  }
  assert.throws(() => parseCodexReply('not JSON'));
});

test('uses stdin, a schema, isolated working directory, and restricted CLI flags', async () => {
  let directory;
  const controller = new AbortController();
  const prompt = 'Listener data: $(do-not-execute)';
  const result = await askCodex(prompt, controller.signal, async (args, input, options) => {
    directory = options.cwd;
    assert.equal(input, prompt);
    assert(!args.includes(prompt));
    assert.equal(args.at(-1), '-');
    assert(args.includes('--ephemeral'));
    assert(args.includes('--ignore-user-config'));
    assert(args.includes('--ignore-rules'));
    assert(args.includes('read-only'));
    assert(args.includes('shell_tool'));
    assert(args.includes('web_search="disabled"'));
    assert.equal(options.signal, controller.signal);
    assert.notEqual(options.cwd, process.cwd());
    const schema = JSON.parse(await readFile(args[args.indexOf('--output-schema') + 1], 'utf8'));
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.properties.action.enum, ['none', 'queue', 'play']);
    return JSON.stringify(reply);
  });
  assert.deepEqual(result, reply);
  await assert.rejects(access(directory), { code: 'ENOENT' });
});

test('cleans up after runner failure, without manufacturing recommendations', async () => {
  let directory;
  await assert.rejects(askCodex('hello', undefined, async (_args, _prompt, options) => {
    directory = options.cwd;
    throw new Error('synthetic CLI failure');
  }), /synthetic CLI failure/);
  await assert.rejects(access(directory), { code: 'ENOENT' });
});

test('cleans up and rejects invalid Codex output', async () => {
  let directory;
  await assert.rejects(askCodex('hello', undefined, async (_args, _prompt, options) => {
    directory = options.cwd;
    return '{}';
  }), /invalid music response/);
  await assert.rejects(access(directory), { code: 'ENOENT' });
});
