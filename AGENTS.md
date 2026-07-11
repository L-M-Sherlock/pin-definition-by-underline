# Repository Guidelines

## Project Structure & Module Organization

This project provides `pinByUnderline()` for Lapis/Anki dictionary cards. Source code lives in `src/`: shared orchestration is in `src/core.js`, and dictionary-specific logic is in `src/adapters/`. The root `script.js` is generated output; edit `src/` first, then rebuild.

Test fixtures are stored in `cases/*.html`, using the dictionary entry name as the file name, for example `cases/付き.html`. Generated HTML snapshots live in `test-output/` and are tracked for regression review. `test-report.md` is a local report and should not be committed.

## Build, Test, and Development Commands

- `npm run build` regenerates `script.js` from `src/` via `scripts/build.js`.
- `npm test` builds, then runs `node test.js`.
- `./test.sh` runs the full test suite, refreshes `test-output/`, and writes `test-report.md`.
- `./test.sh --clean` removes generated test artifacts before rerunning.
- `./test.sh --report` regenerates the report.

After any test run, open the affected `test-output/*.html` file in a real browser or Chrome DevTools before reporting the result. Automated DOM assertions are not enough for final judgment.

## Coding Style & Naming Conventions

Use plain JavaScript with 4-space indentation and semicolons, matching the existing files. Prefer small helper functions over inline DOM manipulation. Adapter factories follow `createMeikyo...Adapter()` naming and return `{ name, canHandle, pin }`. Keep dictionary-specific selectors inside the relevant adapter.

Do not hand-edit `script.js` except to inspect generated output. Commit changes to both `src/` and the regenerated `script.js`.

## Testing Guidelines

Tests use Node.js and `jsdom`. Add new fixtures under `cases/` and commit the corresponding `test-output/` snapshot. Treat `test.js` as a regression guard for rules already encoded in assertions, not as the sole judge for a new case's correctness. For new cases, inspect the browser-rendered output first; then update `test.js` if the expected behavior needs a new automated assertion.

Every test conclusion must include an actual browser rendering check of the relevant output HTML, not just `jsdom` or DOM-order inspection. For `明鏡国語辞典 第三版`, verify both DOM order and visual layout, especially around `level0`, `level1`, gaiji images, and following examples.

## Commit & Pull Request Guidelines

Recent history mostly uses concise conventional prefixes such as `feat:`, `fix:`, `docs:`, and `test:`. Keep commit subjects imperative and scoped, for example `fix: pin kokugo level1 groups`.

Pull requests should describe the dictionary structure affected, list commands run, and include screenshots or notes for visual rendering changes. Mention any updated fixtures and snapshots explicitly.

## Release Checklist

Before committing a user-visible fix or feature, complete the release bookkeeping in the same change unless the user explicitly says not to release it:

1. Choose the appropriate semantic version bump and keep every tracked version surface in sync: `package.json`, the README version badge, and the README current-version section. Update a lockfile too only if the repository tracks it.
2. Prepend a dated entry to `CHANGELOG.md` describing the behavior change and the validation performed.
3. Run `npm run build` and include both the edited `src/` files and regenerated `script.js`.
4. Run the full test suite, refresh and commit affected `test-output/` snapshots, then inspect the relevant output in a real browser as required above.
5. Before committing, run `git diff --check` and review `git status` to confirm that version files, changelog, generated output, tests, and snapshots are all included.

Do not consider a user-visible fix ready to commit while its version number or changelog entry still describes the previous release.
