import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, copyFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const cli = fileURLToPath(new URL('../bin/property-delta.mjs', import.meta.url));
const examples = fileURLToPath(new URL('../examples', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'property-delta-test-'));
const valid = '@property --x { syntax: "*"; inherits: false; initial-value: a b; }';

function fixture(name, content = '') {
  const path = join(directory, name);
  writeFileSync(path, content);
  return path;
}

const a = fixture('before.css', valid);
const b = fixture('after.css', valid.replace('a b', 'ab'));
const empty = fixture('empty.css');

function call(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 15000, ...options });
  assert.ifError(result.error);
  return { ...result, report: args.includes('--json') && result.stdout ? JSON.parse(result.stdout) : null };
}

test('real release files produce five review items with JSON hashes and source positions', () => {
  const result = call([join(examples, 'before.css'), join(examples, 'after.css'), '--json', '--fail-on-change']);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, '');
  assert.equal(result.report.schemaVersion, '1.0.0');
  assert.deepEqual(result.report.counts, { added: 1, removed: 1, 'descriptor-changed': 3, unchanged: 1, unverified: 0, total: 6 });
  assert.equal(result.report.inputs.before.sha256, createHash('sha256').update(readFileSync(join(examples, 'before.css'))).digest('hex'));
  assert.equal(result.report.entries.find(e => e.name === '--space').before[0].location.line, 1);
});

for (const [name, oldValue, newValue] of [['syntax', '"<number>"', '"<integer>"'], ['inherits', 'true', 'false'], ['initial-value', '0', '1']]) {
  test(`CLI isolates ${name} changes in real files`, () => {
    const original = '@property --only { syntax: "<number>"; inherits: true; initial-value: 0; }';
    const left = fixture(`single-${name}-before.css`, original);
    const right = fixture(`single-${name}-after.css`, original.replace(`${name}: ${oldValue}`, `${name}: ${newValue}`));
    const result = call([left, right, '--json', '--fail-on-change']);
    assert.equal(result.status, 1);
    assert.equal(result.report.counts['descriptor-changed'], 1);
    assert.deepEqual(result.report.entries[0].changes.map(change => change.descriptor), [name]);
  });
}

test('CLI hashes original BOM bytes while comparing decoded declarations', () => {
  const path = fixture('bom.css', `\uFEFF${valid}`);
  const result = call([a, path, '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.report.counts.unchanged, 1);
  assert.notEqual(result.report.inputs.before.sha256, result.report.inputs.after.sha256);
});

for (const [label, left, right, options, code] of [
  ['changes without gate', a, b, [], 0],
  ['changes with gate', a, b, ['--fail-on-change'], 1],
  ['identical with gate', a, a, ['--fail-on-change'], 0],
  ['empty files', empty, empty, ['--fail-on-change'], 0],
  ['addition', empty, a, ['--fail-on-change'], 1],
  ['removal', a, empty, ['--fail-on-change'], 1],
  ['malformed CSS', fixture('broken.css', '@property --x {'), a, [], 3],
  ['invalid UTF-8', fixture('bad-utf8.css', Buffer.from([0xff])), a, [], 3],
  ['unreadable file', join(directory, 'missing.css'), a, [], 3],
  ['nonregular file', directory, a, [], 3],
  ['file limit', a, b, ['--max-bytes', '1'], 3],
  ['deadline', a, b, ['--timeout-ms', '1'], 2],
  ['duplicate', fixture('duplicate.css', valid + valid), a, [], 2],
  ['conditional', fixture('conditional.css', `@supports (color:red) { ${valid} }`), a, [], 2],
  ['missing descriptor', fixture('missing-descriptor.css', '@property --x { syntax:"*"; }'), a, [], 2],
  ['underscore descriptor hack', fixture('underscore.css', valid.replace('syntax:', '_syntax:')), a, [], 2],
  ['star descriptor hack', fixture('star.css', valid.replace('syntax:', '*syntax:')), a, [], 2],
  ['imports', fixture('imports.css', '@import "https://example.invalid/never.css";'), a, [], 2]
]) test(`CLI ${label}: exit ${code}`, () => {
  const result = call([left, right, '--json', ...options]);
  assert.equal(result.status, code);
  assert.equal(result.report.gate.exitCode, code);
  assert.equal(result.report.coverage.complete, code < 2);
  if (code >= 2) assert.ok(result.report.exclusions.length);
});

test('CLI mixed changes and uncertainty preserve gate trigger and prefer incomplete exit', () => {
  const left = fixture('mixed-before.css', valid + '@import "unloaded.css";');
  const right = fixture('mixed-after.css', valid.replace('a b', 'ab'));
  const result = call([left, right, '--fail-on-change', '--json']);
  assert.equal(result.status, 2);
  assert.equal(result.report.counts['descriptor-changed'], 1);
  assert.equal(result.report.gate.triggered, true);
});

test('symlinks and named pipes are rejected without blocking', () => {
  const link = join(directory, 'link.css');
  symlinkSync(a, link);
  assert.equal(call([link, a, '--json']).status, 3);
  if (process.platform !== 'win32') {
    const fifo = join(directory, 'pipe.css');
    const mkfifo = spawnSync('mkfifo', [fifo]);
    assert.equal(mkfifo.status, 0);
    assert.equal(call([fifo, a, '--json']).status, 3);
  }
});

for (const args of [[], [a], [a, b, a], [a, b, '--wat'], [a, b, '--max-bytes'], [a, b, '--max-bytes', '-1'], [a, b, '--timeout-ms', '30001'], [a, b, '--timeout-ms', '1.2']]) {
  test(`invalid CLI arguments return JSON usage error: ${JSON.stringify(args)}`, () => {
    const result = call([...args, '--json']);
    assert.equal(result.status, 3);
    assert.equal(result.report.error.code, 'invalid-usage');
  });
}

test('help and version do not read input', () => {
  assert.match(call(['--help']).stdout, /declared-css-only/);
  assert.equal(call(['--version']).stdout, '0.1.0\n');
});

test('paths with spaces and leading dashes work', () => {
  const path = fixture('with spaces.css', valid);
  assert.equal(call([path, path, '--json']).status, 0);
  fixture('-dash.css', valid);
  assert.equal(call(['--json', '--', '-dash.css', '-dash.css'], { cwd: directory }).status, 0);
});

test('human output shows values and escapes terminal control characters', () => {
  const output = call([join(examples, 'before.css'), join(examples, 'after.css')]).stdout;
  assert.match(output, /syntax: "<number>" -> "<integer>"/);
  assert.match(output, /inherits: true -> false/);
  assert.match(output, /initial-value: black -> navy/);
  assert.match(output, /removed --legacy/);
  assert.match(output, /added --accent/);
  const malicious = fixture('control.css', valid.replace('a b', '"\u001b[31m"'));
  assert.equal(call([malicious, a]).stdout.includes('\u001b'), false);
  const c1 = fixture('c1-control.css', valid.replace('a b', '"\u009b31m"'));
  assert.equal(call([c1, a]).stdout.includes('\u009b'), false);
});

test('JSON is reproducible from clean directories using identical relative paths', () => {
  const outputs = [];
  for (const name of ['clean-one', 'clean-two']) {
    const cwd = join(directory, name);
    mkdirSync(cwd);
    copyFileSync(a, join(cwd, 'before.css'));
    copyFileSync(b, join(cwd, 'after.css'));
    outputs.push(call(['before.css', 'after.css', '--json'], { cwd }).stdout);
  }
  assert.equal(outputs[0], outputs[1]);
});

test('runtime only reads explicit CSS files and does not use network, subprocesses, writes or project configuration', () => {
  const cwd = join(directory, 'isolated');
  mkdirSync(cwd);
  copyFileSync(a, join(cwd, 'before.css'));
  copyFileSync(b, join(cwd, 'after.css'));
  writeFileSync(join(cwd, 'postcss.config.mjs'), 'throw new Error("Configuration was executed")');
  writeFileSync(join(cwd, 'package.json'), '{"scripts":{"prepare":"exit 99"}}');
  const guard = join(cwd, 'guard.mjs');
  writeFileSync(guard, `
import { syncBuiltinESMExports } from 'node:module';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import child from 'node:child_process';
const deny = () => { throw new Error('Forbidden side effect'); };
for (const key of ['connect', 'createConnection']) net[key] = deny;
for (const module of [http, https]) for (const key of ['request', 'get']) module[key] = deny;
for (const key of ['lookup', 'resolve']) dns[key] = deny;
for (const key of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) child[key] = deny;
for (const key of ['writeFile', 'appendFile', 'unlink', 'mkdir', 'rename', 'rm']) { fs[key] = deny; fsp[key] = deny; fs[key + 'Sync'] = deny; }
const open = fsp.open;
fsp.open = (path, ...args) => {
  if (!['before.css', 'after.css'].includes(path)) throw new Error('Unexpected file read');
  return open(path, ...args);
};
globalThis.fetch = deny;
syncBuiltinESMExports();
`);
  const hashes = ['before.css', 'after.css'].map(file => createHash('sha256').update(readFileSync(join(cwd, file))).digest('hex'));
  const result = spawnSync(process.execPath, ['--import', guard, cli, 'before.css', 'after.css', '--json'], { cwd, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).counts['descriptor-changed'], 1);
  assert.deepEqual(['before.css', 'after.css'].map(file => createHash('sha256').update(readFileSync(join(cwd, file))).digest('hex')), hashes);
});
