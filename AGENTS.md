# Repository workflow

These instructions apply to the entire JLab Logbook Comment Monitor repository.

## Make changes safely

- Preserve unrelated user changes and inspect `git status` and the scoped diff before staging.
- Work on a short-lived branch rather than committing feature work directly to `main`.
- Keep `manifest.json` and `package.json` on the same version.
- Summarize user-visible changes under that version in `CHANGELOG.md`.
- Never commit passwords, OAuth tokens, private keys, JLab session data, or receiving addresses.

## Verify every code change

Run these commands from the repository root:

```sh
npm run check
npm test
npm run package
```

Confirm that all checks pass and that `dist/` contains both the versioned extension ZIP and its `.sha256` checksum. Package files are release artifacts and should remain uncommitted.

## Commit, push, and merge

1. Review `git status`, `git diff`, and `git diff --check`.
2. Stage only files that belong to the requested change.
3. Use a short commit message describing the complete change.
4. Push the current branch to `origin` through the repository's configured SSH remote.
5. Open or update a pull request targeting `main`.
6. Confirm the **Extension checks** workflow passes before merging.
7. Merge the pull request and verify that `main` contains the intended commit.

Do not claim that a push, merge, tag, or release succeeded without checking the corresponding local or GitHub state.

## Publish a release

Only publish when the user explicitly asks for a release.

1. Confirm the change is merged to `main` and CI is passing.
2. Increase the version in both `manifest.json` and `package.json`; never reuse an existing release version.
3. Update `CHANGELOG.md` and rerun all verification commands.
4. On GitHub, open **Actions → Publish extension release → Run workflow**.
5. Keep the selected branch on **main** and run the workflow.
6. Verify the new GitHub Release is marked **Latest** and includes the versioned ZIP and checksum.
7. Verify the extension's public `releases/latest` endpoint reports the new version.

The manual workflow creates the version tag automatically. Do not create a second tag for the same version. A correctly named tag push remains a supported fallback.
