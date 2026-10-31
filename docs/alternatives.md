# Existing-tool check

Checked on 2026-10-30 using public npm packages and synthetic CSS. This is evidence about the tested versions, not a claim that no other tool exists.

[CSS Property Type Validator](https://github.com/schalkneethling/css-property-type-validator) is the closest alternative. The public npm core `@schalkneethling/css-property-type-validator-core@0.12.0` exposes `validateFiles`, returning a registry with names, decoded syntax, inheritance, initial values and locations. A small comparison of two registry arrays detects the three changes in this project's main fixture. That route works for the uncomplicated example.

Two probes prevent using that inventory alone for this brief:

| Synthetic input | Observed public-core result |
| --- | --- |
| Two `@property --space` blocks | One registry record, the final block; zero diagnostics |
| One `@property --space` inside `@media print` | Empty registry; zero diagnostics |

A registry-only comparator can therefore silently lose duplicate or conditional evidence, and cannot provide this project's coverage and uncertainty contract. Building the missing evidence still requires source parsing. property-delta implements that declaration comparison and leaves normative validation separate, explicitly `not verified`. It does not embed or copy the validator's implementation.

The repository's current README documents `analyzeInputs`, but that export was absent from the installed 0.12.0 public package. Its current [baseline v1 schema](https://github.com/schalkneethling/css-property-type-validator/blob/main/contracts/cli-baseline-v1.schema.json) records diagnostic fingerprints and optional coverage categories, without old descriptor values. Do not treat that baseline as a release descriptor snapshot.

To reproduce the two inventory probes in an isolated directory, install the exact public core version and run this code as an ESM file there:

```sh
npm install --ignore-scripts @schalkneethling/css-property-type-validator-core@0.12.0
```

```js
import { validateFiles } from '@schalkneethling/css-property-type-validator-core';
const block = '@property --space { syntax:"<length>"; inherits:true; initial-value:0px; }';
for (const css of [block + block, `@media print { ${block} }`]) {
  const result = validateFiles([{ path: 'probe.css', css }]);
  console.log(JSON.stringify({ registry: result.registry, diagnostics: result.diagnostics }));
}
```

[jsdiff's `diffCss`](https://github.com/kpdecker/jsdiff) remains a useful textual review alternative. This project adds grouping by registration name, descriptor-level before/after values, structural exclusions and dedicated review exits. The fixture is a synthetic demonstration of a possible release change. No user incident, saved time or direct market demand has been measured.
