import { descriptors } from './compare.mjs';

function safe(text) {
  return JSON.stringify(String(text)).slice(1, -1).replace(/[\u007f-\u009f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function value(descriptor) {
  if (!descriptor.present) return '(absent)';
  if (descriptor.raw.trim() === '') return '(empty)';
  return descriptor.raw.replace(/[\u0000-\u001f\u007f-\u009f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function source(registrations) {
  return registrations.length ? registrations.map(r => `${safe(r.location.file)}:${r.location.line}:${r.location.column}`).join(', ') : '(none)';
}

export function human(report) {
  const c = report.counts;
  const lines = [
    'property-delta | declared-css-only',
    `${c.added} added, ${c.removed} removed, ${c['descriptor-changed']} descriptor-changed, ${c.unchanged} unchanged, ${c.unverified} unverified`,
    `Coverage: ${report.coverage.complete ? 'complete' : 'incomplete'} (${report.coverage.comparedNames}/${report.coverage.observedNames} observed names compared)`,
    'Normative validation: not verified',
    ''
  ];
  for (const entry of report.entries) {
    lines.push(`${entry.status} ${safe(entry.name)}`, `  before ${source(entry.before)}`, `  after  ${source(entry.after)}`);
    if (entry.status === 'descriptor-changed') {
      for (const change of entry.changes) lines.push(`  ${change.descriptor}: ${value(change.before)} -> ${value(change.after)} [${change.kind}]`);
    } else {
      for (const name of descriptors) {
        lines.push(`  ${name}: ${entry.before.length ? entry.before.map(r => value(r.descriptors[name])).join(' | ') : '(absent)'} -> ${entry.after.length ? entry.after.map(r => value(r.descriptors[name])).join(' | ') : '(absent)'}`);
      }
    }
    if (entry.reasons.length) lines.push(`  unverified: ${entry.reasons.join(', ')}`);
    lines.push('');
  }
  for (const exclusion of report.exclusions) {
    const loc = exclusion.location;
    lines.push(`unverified ${exclusion.side} ${safe(loc.file)}:${loc.line}:${loc.column} [${exclusion.code}] ${safe(exclusion.message)}`);
  }
  lines.push(`Review gate: ${report.gate.triggered ? 'triggered' : 'not triggered'}; exit ${report.gate.exitCode}`);
  return `${lines.join('\n')}\n`;
}
