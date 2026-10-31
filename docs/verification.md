# Verification, 2026-10-30

## Current results

- `npm test` passed 98 tests on Node 24.16.0: 98 passed, zero failures, cancellations or skipped tests. An explicit run of both test files also passed 98/98.
- Independent verification repeated `npm ci --ignore-scripts` and `npm test` in a fresh source copy: 98/98 passed. A literal `git clone --no-local` of the committed runtime, followed by dependency installation and `npm test`, also passed 98/98. Pending changes concern the README, recording tape, GIF and this verification record.
- An independently installed tarball produced 1 added, 1 removed, 3 descriptor-changed and 1 unchanged registration. Comparing the reordered fixture produced 5 unchanged registrations and zero changes. Review exits 0, 1, 2 and 3 were checked; mixed uncertainty retained known changes and the gate trigger.
- Regenerated example JSON matches `examples/report.json` byte for byte. The tests cover input hashes, unchanged files, descriptor comparisons, incomplete coverage and runtime side-effect restrictions.
- `vhs validate docs/demo.tape` passed. The tape was executed against the installed CLI. `ffprobe` measured `docs/demo.gif` at 18.44 seconds, 1240 by 1200 pixels, 461 frames and 377,815 bytes. Independent visual review confirmed all three descriptor changes, the addition and removal, followed by the formatting-only comparison with zero changes. Both result screens are readable and unclipped.
- The README embeds that GIF below its badges and contains 657 words. Both existing commits, `9862e7c` and `988ed60`, have author and committer `ZERACK <189363748+itzjk@users.noreply.github.com>`. Neither has a coauthor trailer.

## Recording environment

The system Chrome process could not start in the restricted execution environment. Chromium Headless Shell 156.0.8078.4 worked with `--single-process --no-zygote`. A local copy of VHS 0.12.1 had only its browser executable path redirected to a launcher supplying those flags; the recording and encoding code was unchanged. The shipped tape uses bounded waits for successful CLI completion and a 5 fps capture rate. No terminal output was substituted and no post-recording retiming was applied.

The portable recording command remains `vhs docs/demo.tape` on a host where its browser starts normally.

## Timing observation

An initial independent full run passed 94/98 tests: three subprocesses reached their 15-second test timeout, and the empty-file case reached the CLI deadline. All four cases passed in isolation, then the full suite passed 98/98 in about 2.8 seconds. The literal clean-clone suite passed in about 3.0 seconds. A separate standalone comparison also reached the default deadline before a later successful rerun. The cause is unproven; runtime and test limits were unchanged, and the failure logs were retained locally.

## Remaining release checks

- Main Git metadata is read-only: staging cannot create `.git/index.lock`. The GIF and documentation changes are present in the working tree but could not be committed here.
- The exact README GitHub installation command was attempted with an isolated prefix and cache. It exited 128 with `Repository not found` over HTTPS. Installation from the local package passed; public installation must be checked after the repository becomes accessible.
- Hosted CI has not run. No publication or push was performed.

Browser registration validity, computed styles and consumer compatibility remain outside the declared-CSS comparison scope.
