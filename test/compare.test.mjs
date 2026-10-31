import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compare, extract, categories } from '../src/compare.mjs';

const rule = (name = '--x', syntax = '"<number>"', inherits = 'false', initial = '0') => `@property ${name} { syntax: ${syntax}; inherits: ${inherits}; ${initial === null ? '' : `initial-value: ${initial};`} }`;
const diff = (before, after, options) => compare(extract(before, 'before.css'), extract(after, 'after.css'), options);
const check = report => {
  assert.equal(categories.reduce((sum, k) => sum + report.counts[k], 0), report.counts.total);
  assert.equal(report.coverage.comparedNames + report.coverage.excludedNames, report.coverage.observedNames);
  assert.equal(report.entries.length, new Set(report.entries.map(e => e.name)).size);
};

const before = readFileSync(new URL('../examples/before.css', import.meta.url), 'utf8');
const after = readFileSync(new URL('../examples/after.css', import.meta.url), 'utf8');

test('five-registration release demo finds all three descriptor changes with identical root tokens', () => {
  const report = diff(before, after, { failOnChange: true });
  assert.deepEqual(report.counts, { added: 1, removed: 1, 'descriptor-changed': 3, unchanged: 1, unverified: 0, total: 6 });
  assert.equal(report.gate.exitCode, 1);
  assert.deepEqual(report.entries.filter(e => e.changes.length).map(e => [e.name, e.changes[0].descriptor]), [['--amount', 'syntax'], ['--brand', 'initial-value'], ['--space', 'inherits']]);
  assert.equal(report.inputs.before.registrations.length, 5);
  assert.equal(report.inputs.after.registrations.length, 5);
  assert.equal(report.entries.find(e => e.name === '--brand').changes[0].before.raw, 'black');
  assert.equal(report.entries.find(e => e.name === '--brand').changes[0].after.location.line, 9);
  assert.equal(report.validation.status, 'not verified');
  check(report);
});

test('format, descriptor order, registration order, comments and syntax quotes produce zero changes', () => {
  const report = diff(after, readFileSync(new URL('../examples/reformatted.css', import.meta.url), 'utf8'));
  assert.equal(report.counts.unchanged, 5);
  assert.equal(report.gate.relevantChanges, 0);
  assert.equal(report.coverage.complete, true);
});

for (const [descriptor, changed] of [
  ['syntax', rule('--x', '"<integer>"')],
  ['inherits', rule('--x', '"<number>"', 'true')],
  ['initial-value', rule('--x', '"<number>"', 'false', '1')]
]) test(`individual ${descriptor} change is reviewable`, () => {
  const report = diff(rule(), changed);
  assert.equal(report.counts['descriptor-changed'], 1);
  assert.equal(report.entries[0].changes[0].descriptor, descriptor);
  assert.equal(report.gate.exitCode, 0);
});

for (const [label, left, right, expected] of [
  ['identical', rule(), rule(), 'unchanged'],
  ['addition', '', rule(), 'added'],
  ['removal', rule(), '', 'removed'],
  ['name case', rule('--X'), rule('--x'), 'removed'],
  ['decoded syntax escapes', rule('--x', '"\\3c number>"'), rule(), 'unchanged'],
  ['decoded name escapes', rule('--\\78'), rule(), 'unchanged'],
  ['escaped descriptor names', rule().replace('syntax:', 's\\79 ntax:'), rule(), 'unchanged'],
  ['escaped at-rule name', rule().replace('@property', '@pr\\6f perty'), rule(), 'unchanged'],
  ['keyword case', rule().replace('inherits: false', 'INHERITS: FALSE'), rule(), 'unchanged'],
  ['quoted strings', rule('--x', '"*"', 'false', '"a;{b}"'), rule('--x', '"*"', 'false', "'a;{b}'"), 'unchanged'],
  ['decoded string escape', rule('--x', '"*"', 'false', '"\\61 "'), rule('--x', '"*"', 'false', '"a"'), 'unchanged'],
  ['token boundary', rule('--x', '"*"', 'false', 'a b'), rule('--x', '"*"', 'false', 'ab'), 'descriptor-changed'],
  ['comment boundary', rule('--x', '"*"', 'false', 'a/**/b'), rule('--x', '"*"', 'false', 'ab'), 'descriptor-changed'],
  ['significant whitespace', rule('--x', '"*"', 'false', 'a b'), rule('--x', '"*"', 'false', 'a/**/b'), 'descriptor-changed'],
  ['comment insertion', rule('--x', '"*"', 'false', 'a /**/ b'), rule('--x', '"*"', 'false', 'a b'), 'unchanged'],
  ['whitespace width', rule('--x', '"*"', 'false', 'a  \t b'), rule('--x', '"*"', 'false', 'a b'), 'unchanged'],
  ['identifier escapes retained', rule('--x', '"*"', 'false', '\\61 b'), rule('--x', '"*"', 'false', 'ab'), 'descriptor-changed'],
  ['color representation', rule('--x', '"<color>"', 'false', 'black'), rule('--x', '"<color>"', 'false', '#000'), 'descriptor-changed'],
  ['unit representation', rule('--x', '"<length>"', 'false', '1in'), rule('--x', '"<length>"', 'false', '96px'), 'descriptor-changed'],
  ['grammar representation', rule('--x', '"a | b"'), rule('--x', '"b | a"'), 'descriptor-changed'],
  ['absent versus empty value', rule('--x', '"*"', 'false', null), rule('--x', '"*"', 'false', ''), 'descriptor-changed'],
  ['empty string versus absent', rule('--x', '"*"', 'false', '""'), rule('--x', '"*"', 'false', null), 'descriptor-changed'],
  ['ordinary rules ignored', ':root{--x:1} .x{content:"@property --fake {}"}', '', null]
]) test(label, () => {
  const report = diff(left, right);
  assert.equal(report.coverage.complete, true);
  assert.equal(report.entries.length ? report.entries[0].status : null, expected);
  if (label === 'name case') assert.equal(report.counts.removed, 1);
  check(report);
});

test('empty stylesheets and no registrations are complete', () => {
  for (const text of ['', '/* nothing */', ':root { --x: 1 }']) {
    const report = diff(text, text, { failOnChange: true });
    assert.equal(report.counts.total, 0);
    assert.equal(report.gate.exitCode, 0);
    assert.equal(report.coverage.complete, true);
  }
});

for (const [label, text, code] of [
  ['duplicate registrations', `${rule()}\n${rule()}`, 'duplicate-registration'],
  ['conditional registration', `@media print { ${rule()} }`, 'nested-registration'],
  ['nested registration', `.x { ${rule()} }`, 'nested-registration'],
  ['duplicate descriptor', rule().replace('inherits: false;', 'inherits:false; inherits:true;'), 'repeated-descriptor'],
  ['missing syntax', rule().replace('syntax: "<number>";', ''), 'missing-descriptor'],
  ['missing inherits', rule().replace('inherits: false;', ''), 'missing-descriptor'],
  ['missing initial', rule('--x', '"<number>"', 'false', null), 'missing-descriptor'],
  ['nonstring syntax', rule('--x', '<number>'), 'unreadable-descriptor'],
  ['empty syntax', rule('--x', '""'), 'unreadable-descriptor'],
  ['nonboolean inherits', rule('--x', '"*"', 'maybe'), 'unreadable-descriptor'],
  ['important descriptor', rule('--x', '"*"', 'false !important'), 'important-descriptor'],
  ['unknown descriptor', rule().replace('inherits:', 'inherit:'), 'unknown-descriptor'],
  ['underscore syntax hack', rule().replace('syntax:', '_syntax:'), 'unknown-descriptor'],
  ['star syntax hack', rule().replace('syntax:', '*syntax:'), 'unknown-descriptor'],
  ['underscore inherits hack', rule().replace('inherits:', '_inherits:'), 'unknown-descriptor'],
  ['star initial value hack', rule().replace('initial-value:', '*initial-value:'), 'unknown-descriptor'],
  ['blockless rule', '@property --x;', 'missing-block'],
  ['nested content', '@property --x { .foo { color:red } }', 'unsupported-registration-content']
]) test(`${label} remains unverified with location`, () => {
  const report = diff(text, '');
  assert.equal(report.coverage.complete, false);
  assert.equal(report.counts.removed, 0);
  assert.equal(report.entries[0].status, 'unverified');
  assert.equal(report.gate.exitCode, 2);
  assert.ok(report.exclusions.some(e => e.code === code && e.location.line > 0));
  check(report);
});

test('duplicates and repeated descriptors retain every occurrence for review', () => {
  const report = diff(rule() + rule('--x', '"*"'), '');
  assert.equal(report.entries[0].before.length, 2);
  const repeated = diff(rule().replace('initial-value: 0;', 'initial-value: 0; initial-value: 4;'), '');
  assert.deepEqual(repeated.entries[0].before[0].descriptors['initial-value'].occurrences.map(d => d.raw), ['0', '4']);
});

for (const [label, text] of [
  ['import', '@import "never-read.css";'],
  ['bad prelude', '@property --x extra { syntax:"*"; inherits:false; }'],
  ['missing name', '@property { syntax:"*"; inherits:false; }']
]) test(`${label} prevents false added or removed names`, () => {
  for (const report of [diff(text, rule()), diff(rule(), text)]) {
    assert.equal(report.entries[0].status, 'unverified');
    assert.equal(report.counts.added + report.counts.removed, 0);
    assert.equal(report.gate.exitCode, 2);
    check(report);
  }
});

for (const text of ['@property --x {', '@property --x { syntax: "oops; }', rule('--x', '"*"', 'false', 'x)'), rule('--x', '"*"', 'false', 'url("oops"'), '/* unclosed']) {
  test(`malformed CSS never yields complete comparison: ${text}`, () => {
    const report = diff(text, rule());
    assert.equal(report.gate.exitCode, 3);
    assert.equal(report.coverage.complete, false);
    assert.equal(report.counts.added + report.counts.removed, 0);
    assert.equal(report.entries[0].status, 'unverified');
  });
}

test('known changes survive imports and unrelated uncertain names', () => {
  const report = diff(rule() + rule('--uncertain') + '@import "unknown.css";', rule('--x', '"<integer>"') + `@media print {${rule('--uncertain')}}` + rule('--missing'), { failOnChange: true });
  assert.equal(report.counts['descriptor-changed'], 1);
  assert.equal(report.counts.unverified, 2);
  assert.equal(report.gate.triggered, true);
  assert.equal(report.gate.exitCode, 2);
  check(report);
});

test('a parse failure keeps recognizable names without claiming additions', () => {
  const report = diff(rule('--old') + '@property --broken {', rule('--new'));
  assert.deepEqual(report.entries.map(e => e.name), ['--broken', '--new', '--old']);
  assert.equal(report.counts.unverified, 3);
});

test('all raw descriptors are preserved and absence is explicit', () => {
  const report = diff(rule('--x', "'*'", 'FALSE', null), rule('--x', '"*"', 'false', '""'));
  assert.equal(report.entries[0].before[0].descriptors.syntax.raw, "'*'");
  assert.equal(report.entries[0].before[0].descriptors.inherits.value, false);
  assert.equal(report.entries[0].before[0].descriptors['initial-value'].present, false);
  assert.equal(report.entries[0].after[0].descriptors['initial-value'].present, true);
  assert.equal(report.entries[0].after[0].descriptors['initial-value'].raw, '""');
});

test('UTF-8 BOM does not shift parser and tokenizer positions in the public extraction API', () => {
  const report = diff(`\uFEFF${rule()}`, rule());
  assert.equal(report.counts.unchanged, 1);
  assert.equal(report.coverage.complete, true);
  assert.notEqual(report.inputs.before.sha256, report.inputs.after.sha256);
});
