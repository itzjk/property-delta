# Verification, 2026-10-30

## Observed results

- Fresh source copy without dependencies or Git metadata: `npm ci --ignore-scripts` succeeded with five dependency packages. `npm test` passed 98 tests with zero failures, cancellations or skipped tests on Node 24.16.0.
- The same 98 tests passed on Node 22.23.4.
- An independent README review reproduced the result in another fresh copy. Nine additional scenarios were exercised with the installed CLI, covering escapes, duplicate names, imports, conditional registrations, token boundaries and mixed uncertainty/change output.
- A tarball from `npm pack` installed into an isolated global prefix. The installed executable worked outside the source tree. The GitHub-style quick-start usage produced 1 added, 1 removed, 3 descriptor-changed and 1 unchanged. The reformatted example produced five unchanged registrations and zero changes.
- The checked-in `examples/report.json` matches regenerated JSON exactly. Relative-path reports match across two clean directories. Input hashes remain unchanged after analysis.
- A mutation disabling descriptor comparison made the main five-registration test fail with exit 1: zero descriptor changes instead of three. A names-only or unchanged-token comparison cannot satisfy that test.
- Runtime tests prohibit network calls, subprocesses, writes and unexpected explicit file opens. Project configuration is present but never executed. Size/deadline failures, malformed CSS and incomplete coverage have distinct tested exits.
- README length: 668 words. `vhs validate docs/demo.tape` succeeds. No private paths or credentials are included in distributable source or documentation.

## Incomplete delivery checks

- `vhs docs/demo.tape` exits 1 because its browser exits before the debugging endpoint is ready. Retrying with `VHS_NO_SANDBOX=1` has the same result. There is no generated GIF and no placeholder image claiming a recording. The tape remains ready to run on a host where the browser starts.
- `npm i -g github:itzjk/property-delta` was attempted with an isolated installation prefix. Git transport failed with exit 128 and SSH authentication errors. The unauthenticated public repository API returned HTTP 404. The exact public installation command therefore remains unverified; the local packaged installation passed.
- Git metadata is read-only in this environment. Staging fails while creating `.git/index.lock`, so no project commits could be made. Fresh-directory verification is not a committed clean-clone check.
- The CI workflow is provided for Node 22 and 24, but a hosted run has not occurred. No publication or push was performed.

The declaration-comparison behavior is tested for existing and new inputs in the supported subset. Browser validation, computed styles and consumer compatibility remain outside scope. Public delivery still requires the GIF, writable Git metadata, a clean-clone check and a public installation check after repository creation.
