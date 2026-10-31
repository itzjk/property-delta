# Verification, 2026-10-30

## Round 4 results

- `npm test` passed on Node 24.16.0 with an explicit TAP summary: 98 tests, 98 passed, zero failures, cancellations, skips or todos. The test script now selects TAP in both terminals and CI so the count remains visible.
- Independent README-only verification ran `npm ci` and `npm test` in a fresh source copy: 98 tests passed. The release example produced 1 added, 1 removed, 3 descriptor-changed and 1 unchanged registration with complete coverage. Its generated JSON matched `examples/report.json` byte for byte.
- A literal local Git clone with the current patch applied also passed `npm ci` and all 98 tests. Installation of the packed CLI into an isolated npm prefix succeeded.
- The independent formatting-only comparison produced 5 unchanged registrations and zero changes. With `--fail-on-change`, the release comparison returned 1 and the formatting-only comparison returned 0. Help and version commands also passed.
- `vhs validate docs/demo.tape` passed. Executing the tape with VHS 0.12.1 completed with exit 0. `ffprobe` measured the resulting `docs/demo.gif` at 19.24 seconds, 1240 by 1200 pixels, 481 frames and 390,363 bytes.
- Frames decoded from the GIF itself were inspected independently at the beginning, 5 seconds and 15 seconds. The first frame contains the complete release report, including all three descriptor changes, addition, removal and triggered review gate. The later screen shows five unchanged registrations and an untriggered gate. Neither report is clipped.
- The tape now requires only Node and invokes `node bin/property-delta.mjs` from the clone. It executes the first comparison before starting capture, making the first frame useful in viewers that do not animate GIFs. Both comparisons request the review gate and wait for their distinct completion lines with a 30-second timeout. No CLI output was substituted or post-recording retiming applied.
- The README embeds the GIF below its badges and contains 685 words. `git diff --check` passed. Existing commits have the required author and committer identities and no coauthor trailers.

## Recording environment

The standard `vhs docs/demo.tape` invocation failed to launch the system browser in the restricted environment. Recording succeeded with the existing local VHS 0.12.1 build, directing its browser launcher to Chromium Headless Shell. The local build changes browser selection and offers process flags; its capture and encoding code is unchanged. This environment-specific build is not part of the package.

On a host where VHS can start its browser, reproduce from the repository root with `npm ci` followed by `vhs docs/demo.tape`. No global property-delta installation is needed.

## Remaining release checks

- Earlier round-3 runs intermittently hit subprocess or analysis deadlines before passing on rerun. The cause remains unproven; this recording-only repair does not change runtime or test deadlines. Round-4 runs reported above passed without retries.
- The exact README GitHub installation command was attempted independently with an isolated prefix and cache. It exited 128 while authenticating the SSH GitHub connection (`Permission denied (publickey)`). Public installation remains unverified.
- Hosted CI has not run. No publication or push was performed.
- Git metadata is read-only in this workspace; the delivery consists of working-tree changes for the release process to commit.

Browser registration validity, computed styles and consumer compatibility remain outside the declared-CSS comparison scope. The recording fix applies to the existing demo files; runtime comparison behavior was unchanged.
