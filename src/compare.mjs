import postcss from 'postcss';
import { createHash } from 'node:crypto';
import { TokenType as T } from '@csstools/css-tokenizer';
import { tokens, identifier, atName, descriptorValue } from './values.mjs';

export const descriptors = ['syntax', 'inherits', 'initial-value'];
export const categories = ['added', 'removed', 'descriptor-changed', 'unchanged', 'unverified'];

function location(file, node) {
  return { file, line: node.source.start.line, column: node.source.start.column };
}

function position(file, css, offset) {
  const lines = css.slice(0, Math.max(0, offset)).split(/\r\n|\n|\r|\f/);
  return { file, line: lines.length, column: lines.at(-1).length + 1 };
}

function blank() {
  return Object.fromEntries(descriptors.map(name => [name, { present: false, raw: null, value: null, location: null }]));
}

export function emptyInput(file) {
  return { file, sha256: null, bytes: null, parseStatus: 'unavailable', unknownNames: true, registrations: [], exclusions: [] };
}

export function extract(css, file, bytes = Buffer.from(css)) {
  if (css.charCodeAt(0) === 0xfeff) css = css.slice(1);
  const result = { ...emptyInput(file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, parseStatus: 'parsed', unknownNames: false };
  const lex = tokens(css);
  const tokenAtOffset = new Map(lex.items.map((token, index) => [token[2], index]));
  const stack = [];
  const pairs = new Map([[T.Function, T.CloseParen], [T.OpenParen, T.CloseParen], [T.OpenSquare, T.CloseSquare], [T.OpenCurly, T.CloseCurly]]);
  const closers = new Set(pairs.values());
  for (const token of lex.items) {
    if (pairs.has(token[0])) stack.push({ close: pairs.get(token[0]), offset: token[2] });
    else if (closers.has(token[0]) && stack.pop()?.close !== token[0]) lex.errors.push({ message: 'Unmatched closing token.', sourceStart: token[2] });
  }
  for (const token of stack) lex.errors.push({ message: 'Unclosed component value.', sourceStart: token.offset });
  const exclude = (code, message, loc, name = null, registration = null) => {
    const evidence = { code, message, name, location: loc };
    result.exclusions.push(evidence);
    if (registration) registration.reasons.push(code);
    return evidence;
  };
  const observed = [];
  for (let i = 0; i < lex.items.length; i++) {
    const t = lex.items[i];
    if (t[0] !== T.AtKeyword || t[4].value.toLowerCase() !== 'property') continue;
    let j = i + 1;
    while ([T.Whitespace, T.Comment].includes(lex.items[j]?.[0])) j++;
    const next = lex.items[j];
    if (next?.[0] === T.Ident && next[4].value.startsWith('--') && next[4].value.length > 2) {
      observed.push({ name: next[4].value, rawName: next[1], location: position(file, css, t[2]), descriptors: blank(), reasons: ['unparseable-css'] });
    }
  }
  let root;
  try {
    root = postcss.parse(css, { from: file });
  } catch (error) {
    result.parseStatus = 'invalid';
    result.unknownNames = true;
    result.registrations = observed;
    exclude('unparseable-css', error.reason || 'CSS could not be parsed.', { file, line: error.line || 1, column: error.column || 1 });
    return result;
  }
  if (lex.errors.length) {
    result.parseStatus = 'invalid';
    result.unknownNames = true;
    for (const error of lex.errors.slice(0, 20)) {
      exclude('tokenization-error', error.message, position(file, css, error.sourceStart));
    }
  }
  root.walkAtRules(node => {
    const index = tokenAtOffset.get(node.source.start.offset);
    const keyword = lex.items[index];
    const type = keyword?.[0] === T.AtKeyword ? keyword[4].value.toLowerCase() : atName(node.name);
    if (type === 'import') {
      result.unknownNames = true;
      exclude('import-not-loaded', 'Imports are not loaded; missing names cannot be classified.', location(file, node));
    }
    if (type !== 'property') return;
    let end = index + 1;
    while (end < lex.items.length && ![T.OpenCurly, T.Semicolon].includes(lex.items[end][0])) end++;
    const rawName = keyword ? css.slice(keyword[3] + 1, lex.items[end]?.[2] ?? css.length).trim() : node.params;
    const parsedName = identifier(rawName);
    const validName = parsedName?.startsWith('--') && parsedName.length > 2;
    const loc = location(file, node);
    if (!validName) {
      result.unknownNames = true;
      exclude('unreadable-name', 'Expected one custom property name.', loc);
      return;
    }
    const registration = { name: parsedName, rawName, location: loc, descriptors: blank(), reasons: [] };
    result.registrations.push(registration);
    const reject = (code, message, source = node) => exclude(code, message, location(file, source), parsedName, registration);
    if (node.parent !== root) reject('nested-registration', 'Nested or conditional registrations are outside coverage.');
    if (!node.nodes) {
      reject('missing-block', 'Expected a registration block.');
      return;
    }
    for (const child of node.nodes) {
      if (child.type === 'comment') continue;
      if (child.type !== 'decl') {
        reject('unsupported-registration-content', 'Only descriptor declarations are supported.', child);
        continue;
      }
      const declaration = css.slice(child.source.start.offset, child.source.end.offset + 1);
      const colon = tokens(declaration).items.find(token => token[0] === T.Colon);
      const name = colon ? identifier(declaration.slice(0, colon[2]))?.toLowerCase() : null;
      if (!descriptors.includes(name)) {
        reject('unknown-descriptor', 'Unrecognized descriptor; declaration comparison is incomplete.', child);
        continue;
      }
      const raw = child.raws.value?.raw ?? child.value;
      const decoded = descriptorValue(name, raw);
      const value = { present: true, raw, value: decoded.value, location: location(file, child) };
      const previous = registration.descriptors[name];
      if (previous.present) {
        previous.occurrences ??= [{ raw: previous.raw, value: previous.value, location: previous.location }];
        previous.occurrences.push({ raw, value: decoded.value, location: value.location });
        reject('repeated-descriptor', `Repeated ${name} descriptor.`, child);
      } else {
        registration.descriptors[name] = value;
      }
      if (child.important || child.raws.important) reject('important-descriptor', '!important descriptors are outside coverage.', child);
      if (!decoded.readable) reject('unreadable-descriptor', `Cannot read ${name} as a ${name === 'syntax' ? 'nonempty string' : 'boolean'}.`, child);
    }
    for (const name of ['syntax', 'inherits']) {
      if (!registration.descriptors[name].present) reject('missing-descriptor', `Missing ${name} descriptor.`);
    }
    if (registration.descriptors.syntax.value !== '*' && !registration.descriptors['initial-value'].present) {
      reject('missing-descriptor', 'Missing initial-value for a non-universal syntax.');
    }
  });
  const groups = new Map();
  for (const registration of result.registrations) {
    const group = groups.get(registration.name) ?? [];
    group.push(registration);
    groups.set(registration.name, group);
  }
  for (const [name, group] of groups) {
    if (group.length > 1) {
      for (const registration of group) exclude('duplicate-registration', 'Duplicate names have no single declaration to compare.', registration.location, name, registration);
    }
  }
  if (result.parseStatus === 'invalid') {
    for (const registration of result.registrations) registration.reasons.push('tokenization-error');
  }
  return result;
}

function byName(input) {
  const groups = new Map();
  for (const registration of input.registrations) {
    const group = groups.get(registration.name) ?? [];
    group.push(registration);
    groups.set(registration.name, group);
  }
  return groups;
}

function difference(before, after) {
  return descriptors.filter(name => {
    const a = before.descriptors[name];
    const b = after.descriptors[name];
    return a.present !== b.present || JSON.stringify(a.value) !== JSON.stringify(b.value);
  }).map(descriptor => ({ descriptor, kind: descriptor === 'initial-value' ? 'token-representation' : descriptor === 'syntax' ? 'decoded-string' : 'boolean', before: before.descriptors[descriptor], after: after.descriptors[descriptor] }));
}

export function compare(before, after, { failOnChange = false } = {}) {
  const a = byName(before);
  const b = byName(after);
  const names = [...new Set([...a.keys(), ...b.keys()])].sort();
  const entries = names.map(name => {
    const left = a.get(name) ?? [];
    const right = b.get(name) ?? [];
    const reasons = [...new Set([...left, ...right].flatMap(r => r.reasons))];
    if (!left.length && before.unknownNames) reasons.push('before-names-incomplete');
    if (!right.length && after.unknownNames) reasons.push('after-names-incomplete');
    const changes = left.length === 1 && right.length === 1 && !reasons.length ? difference(left[0], right[0]) : [];
    const status = reasons.length ? 'unverified' : !left.length ? 'added' : !right.length ? 'removed' : changes.length ? 'descriptor-changed' : 'unchanged';
    return { name, status, before: left, after: right, changes, reasons };
  });
  const counts = Object.fromEntries(categories.map(status => [status, entries.filter(e => e.status === status).length]));
  counts.total = entries.length;
  const exclusions = [...before.exclusions.map(e => ({ side: 'before', ...e })), ...after.exclusions.map(e => ({ side: 'after', ...e }))];
  const invalid = [before, after].some(input => ['invalid', 'unavailable'].includes(input.parseStatus));
  const complete = !invalid && !exclusions.length && !counts.unverified;
  const relevantChanges = counts.added + counts.removed + counts['descriptor-changed'];
  const exitCode = invalid ? 3 : !complete ? 2 : failOnChange && relevantChanges > 0 ? 1 : 0;
  return {
    schemaVersion: '1.0.0',
    tool: 'property-delta',
    coverage: { mode: 'declared-css-only', complete, observedNames: names.length, comparedNames: names.length - counts.unverified, excludedNames: counts.unverified },
    validation: { status: 'not verified', reason: 'Declaration comparison only; syntax grammars, initial-value validity and browser registration are not validated.' },
    inputs: { before, after },
    counts,
    entries,
    exclusions,
    gate: { failOnChange, relevantChanges, triggered: failOnChange && relevantChanges > 0, exitCode }
  };
}
