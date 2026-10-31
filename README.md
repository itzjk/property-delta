# property-delta

See which CSS custom property registrations changed before you ship a release.

[![CI](https://github.com/itzjk/property-delta/actions/workflows/ci.yml/badge.svg)](https://github.com/itzjk/property-delta/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

```text
property-delta | declared-css-only
1 added, 1 removed, 3 descriptor-changed, 1 unchanged, 0 unverified
Coverage: complete (6/6 observed names compared)
Normative validation: not verified
```

## Quick start

Requires Node.js 22 or newer. Install:

```sh
npm i -g github:itzjk/property-delta
```

Compare two compiled CSS files:

```sh
property-delta before.css after.css
```

## Features

- Review additions, removals and descriptor changes by property name.
- Keep original descriptor values and source locations beside each result.
- Ignore registration order, descriptor order and surrounding formatting.
- Save deterministic JSON with input hashes, counts and exclusions.
- Require release review in CI with a dedicated change gate.
- Keep known changes visible when other declarations are unverified.

## Why

A release can keep every `:root` assignment and change a token's inheritance, initial value or accepted syntax through [`@property`](https://drafts.css-houdini.org/css-properties-values-api/#at-property-rule). The included five-registration example demonstrates all three changes with identical assignments. [CSS Property Type Validator](https://github.com/schalkneethling/css-property-type-validator) covers validation; property-delta focuses on comparing declarations between releases, including evidence its tested published inventory omits ([comparison notes](docs/alternatives.md)).

## How it works

PostCSS locates registration blocks and descriptor declarations. A CSS tokenizer decodes names and syntax strings, reads inheritance booleans and builds an explicit token representation for initial values. Registrations are matched by case-sensitive decoded name, then classified as `added`, `removed`, `descriptor-changed`, `unchanged` or `unverified`. An addition and removal stay separate; there is no rename inference. The report covers `declared-css-only`, with normative validation marked `not verified`. See the [report contract](docs/report-v1.md) for normalization and uncertainty rules.

## Usage

| Option | Purpose |
| --- | --- |
| `before.css after.css` | Read the two explicit local files |
| `--json` | Write schema version 1.0.0 JSON to stdout |
| `--fail-on-change` | Request review of additions, removals and descriptor changes |
| `--max-bytes N` | Set the per-file budget, default 1 MiB, maximum 5 MiB |
| `--timeout-ms N` | Set the analysis deadline, default 5 seconds, maximum 30 seconds |
| `--` | Treat remaining arguments as paths, including names starting with a dash |
| `--help`, `--version` | Show help or version |

Exit `0` means the complete comparison passed the requested gate. Exit `1` means a complete comparison found changes requiring review. Exit `2` means comparison is incomplete. Exit `3` means invalid input or usage. Uncertainty takes precedence over the change gate; known changes and the gate trigger remain in JSON.

From a clone, reproduce the release example and save its report:

```sh
node bin/property-delta.mjs examples/before.css examples/after.css --json > report.json
```

Then compare `examples/after.css` with `examples/reformatted.css`: five unchanged registrations, zero changes. The committed [example report](examples/report.json) has the same result structure.

## FAQ

**Does a descriptor change prove a breaking change?** No. Initial values are compared as token representations. `black` and `#000` differ in this report, even if a browser renders them alike. Maintainers decide whether consumers need changes.

**Does it follow imports or execute project configuration?** It reads only the two specified CSS files. Imports produce incomplete coverage. JavaScript registrations, configuration, package resolution and network access are outside the analysis.

**What happens to duplicate or conditional registrations?** They remain unverified with their locations. A hidden or unreadable name cannot become a claimed addition or removal. Other comparable names still appear in the report.

**Does it edit my files?** No. The CLI reads regular UTF-8 files; symlinks, directories and devices are rejected. Reports go to stdout.

## Limitations

- Start with compiled CSS containing unique top-level registrations and no imports.
- Browser registration, syntax grammar validity, computed values and visual regressions are not verified.
- Repeated, missing required or unreadable descriptors produce uncertainty.
- Initial-value whitespace width is normalized; whitespace presence, token boundaries and non-string token spellings are retained. Formatting inside a value can therefore be a representation change.

## Contributing

Run `npm ci` and `npm test`; include a failing reproduction with a behavior change. To record the terminal demo, install the CLI, then run `vhs docs/demo.tape` from the repository root.

## License

[MIT](LICENSE).
