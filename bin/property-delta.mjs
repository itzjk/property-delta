#!/usr/bin/env node
import { run } from '../src/run.mjs';
import { human } from '../src/format.mjs';

const help = `Usage: property-delta <before.css> <after.css> [options]

Compare declared CSS @property registrations between two local files.

  --json                 Print the versioned JSON report
  --fail-on-change       Exit 1 when complete comparison finds changes
  --max-bytes <bytes>    Per-file limit (default 1048576, max 5242880)
  --timeout-ms <ms>      Total read/analysis deadline (default 5000, max 30000)
  --help                 Show this help
  --version              Show version

Exit codes: 0 accepted, 1 review requested, 2 incomplete, 3 invalid input/usage.
Coverage: declared-css-only. Normative validation: not verified.
`;

const args = process.argv.slice(2);
let json = false;
const options = {};
const files = [];
let error;
let literal = false;
let informational;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (literal) files.push(arg);
  else if (arg === '--') literal = true;
  else if (arg === '--json') json = true;
  else if (arg === '--fail-on-change') options.failOnChange = true;
  else if (arg === '--help') informational = help;
  else if (arg === '--version') informational = '0.1.0\n';
  else if (['--max-bytes', '--timeout-ms'].includes(arg)) {
    const raw = args[i + 1];
    if (raw !== undefined && !raw.startsWith('--')) i++;
    const number = Number(raw);
    const max = arg === '--max-bytes' ? 5242880 : 30000;
    if (!/^\d+$/.test(raw ?? '') || !Number.isSafeInteger(number) || number < 1 || number > max) error = `${arg} must be an integer from 1 to ${max}.`;
    options[arg === '--max-bytes' ? 'maxBytes' : 'timeoutMs'] = number;
  } else if (arg.startsWith('-')) error = `Unknown option: ${arg}`;
  else files.push(arg);
}
if (!informational && files.length !== 2) error ??= 'Expected exactly two local CSS files.';
if (error) {
  const message = { schemaVersion: '1.0.0', tool: 'property-delta', error: { code: 'invalid-usage', message: error }, exitCode: 3 };
  (json ? process.stdout : process.stderr).write(json ? `${JSON.stringify(message, null, 2)}\n` : `${error}\n${help}`);
  process.exitCode = 3;
} else if (informational) {
  process.stdout.write(informational);
} else {
  const report = await run(files[0], files[1], options);
  process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : human(report));
  process.exitCode = report.gate.exitCode;
}
