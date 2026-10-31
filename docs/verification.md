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

## Release-review follow-up, 2026-10-30

- Added the missing `developer-tools` package keyword. The tape now requires and invokes the installed `property-delta` command for both examples.
- `git log --all` shows one commit, `9862e7c`. Its author and committer are both `ZERACK <189363748+itzjk@users.noreply.github.com>`, with no coauthor trailer. No history rewrite is needed.
- `npm test` passed all 98 tests on Node 24.16.0, with zero failures, cancellations or skipped tests.
- Repacked and installed the current package into an isolated global prefix. From a separate input directory, the installed CLI reported 1 added, 1 removed, 3 descriptor-changed and 1 unchanged, with gate exit 1. The reordered fixture reported 5 unchanged and zero changes, with gate exit 0. Both comparisons had complete declared-CSS coverage. The input hashes stayed intact, and regenerated example JSON matched the committed report byte for byte.
- `vhs validate docs/demo.tape` passed. Recording with VHS 0.12.1 failed both normally and with `VHS_NO_SANDBOX=1`: `could not start browser: browser exited unexpectedly before its debugging endpoint was ready`. A separate headless Chrome startup also exited unsuccessfully. No GIF was generated. The README keeps the terminal example instead of linking to an absent image, so the mandatory GIF and its README embed remain unresolved.
- Retried `npm i -g github:itzjk/property-delta` with an isolated prefix and cache. It exited 128 because Git's SSH transport failed with `Host key verification failed`. The exact public installation command remains unverified; the local packaged installation passed.
- Independent review used `git clone --no-local` plus the working-tree patch. Dependency installation, packing, isolated global installation and both installed demo comparisons passed. Its first full test run passed 97 of 98 tests: the initial-value case returned incomplete exit 2 instead of 1. That case passed alone. A full diagnostic rerun then passed 98 of 98 tests in 21.76 seconds, with no unexpected incomplete reports. The initial intermittent failure's cause remains unproven; no runtime limits were changed to hide it.
- No push or publication was performed.
