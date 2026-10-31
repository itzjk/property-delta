# Report contract v1.0.0

The JSON report has no timestamps or environment-dependent identifiers. Paths are the arguments supplied by the caller, so identical relative paths and bytes produce identical reports in different directories. Entries are sorted by decoded property name using JavaScript's code-unit ordering. Locations are one-based parser source positions, not byte offsets. Hashes are SHA-256 of the original bytes, including any UTF-8 BOM. Node.js 22 or newer is required.

## Top-level fields

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `1.0.0`, independently versioned from the package |
| `tool` | `property-delta` |
| `coverage` | Mode, completeness, observed/compared/excluded name counts |
| `validation` | `status: "not verified"` and a reason |
| `inputs.before`, `inputs.after` | Path, hash, byte count, parsing state, unknown-name flag, registration occurrences and exclusions |
| `counts` | Counts for all five mutually exclusive categories plus `total` |
| `entries` | Name, status, before/after occurrence arrays, changes and uncertainty reasons |
| `exclusions` | Evidence with side, code, message, name or null, and location |
| `gate` | Requested gate, relevant change count, trigger and actual exit code |

A usage failure instead returns `{schemaVersion, tool, error: {code, message}, exitCode: 3}`. Invalid or unreadable CSS returns the comparison shape, retaining evidence from the other input. An unavailable hash is null, never a digest of an empty substitute. Inputs that fail UTF-8 decoding, I/O checks or size checks have unavailable bytes/hash metadata. A deadline or worker resource failure has incomplete coverage and exit 2; finished input evidence is retained.

## Declaration records

Each registration has `name`, `rawName`, `location`, `descriptors` and `reasons`. Every descriptor (`syntax`, `inherits`, `initial-value`) has `present`, `raw`, `value`, `location`. Absence has `present: false` with all other fields null. An empty string and an empty token list are present values. Repeated descriptors retain the first occurrence plus an `occurrences` array containing all values and locations. Duplicate registrations retain every occurrence; there is no cascade selection. `raw` preserves the parser's original descriptor value text, excluding outer declaration spacing and `!important`; unsupported importance is reported as evidence.

The before/after occurrence arrays are empty for an unobserved name. This does not mean absence is proven if that input has `unknownNames: true`. Names are CSS-decoded identifiers and remain case-sensitive. Escape-equivalent names match; their raw spellings remain available. Syntax and inheritance descriptor names and the `@property` keyword are ASCII case-insensitive.

## Comparison representations

- `syntax`: exactly one decoded CSS string. Quotes and equivalent CSS escapes do not change it. The string's internal spacing, order and grammar spelling are retained. Empty or non-string syntax is unverified. The grammar itself is not validated.
- `inherits`: exactly one decoded identifier, case-insensitive `true` or `false`, compared as a boolean. All other forms are unverified.
- `initial-value`: a flat ordered list of `[CSS token type, original spelling]`. Strings use their decoded content instead of their quoted spelling. Comments disappear but never merge neighboring tokens. Whitespace runs between tokens become `["space"]`; leading/trailing whitespace disappears. Escape terminators inside tokens remain part of those tokens. No units, numbers, colors, function spellings or identifiers are canonicalized. This representation can report a change for a semantically equivalent value. Presence of whitespace remains significant, including around punctuation.

Each change includes `descriptor`, `kind` (`decoded-string`, `boolean`, `token-representation`) and complete before/after descriptor records. A presence change also appears as a descriptor change. No visual, semantic or compatibility claim follows from any category.

## Coverage and exits

`coverage.complete` refers only to whether all observed declarations were compared within the supported structural subset. It does not certify valid browser registrations. Grammar parsing, computational independence, matching an initial value to a syntax, invalid ordinary selectors/declarations and CSS error recovery are not normative validation features. PostCSS is a structural parser, not a browser validator.

A uniquely named, top-level block with readable descriptors can be compared even when an import elsewhere makes overall coverage incomplete. Both names must be visible to establish that pairing. A name found on only one side is unverified if the other side has an import, unreadable prelude, parser failure, deadline or unread input. Duplicate, nested/conditional, blockless and unsupported registrations taint their names. Missing `syntax` or `inherits`, and missing `initial-value` unless syntax is `"*"`, are unverified. Unknown descriptors are conservatively excluded. No observed names plus an exclusion still means incomplete coverage.

PostCSS failures, tokenizer errors and unbalanced component tokens make the CSS structurally invalid. Recognizable names from failed parses are retained only as unverified evidence; there is no recovery-based comparison. Unknown-name evidence does not erase unrelated known changes. The five category counts sum to the union of observed names; excluded/compared coverage counts partition that union. An invalid unnamed prelude is an exclusion, not an invented property name.

Exit precedence: invalid input/usage (3), incomplete comparison (2), complete gated change (1), accepted (0). `gate.triggered` can remain true with exit 2 or 3. Default limits are 1,048,576 bytes per file and 5,000 ms for worker startup, both reads and analysis. Hard option ceilings are 5,242,880 bytes and 30,000 ms. The worker has a 128 MiB old-generation memory budget and is terminated on deadline. File changes detected during reading are rejected. There are no imports, config discovery, network calls, scripts, repairs or migrations.
