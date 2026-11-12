# Storefront UI package releases

For an unmerged package feature, run `python3 scripts/preview-packages.py
--vue-ref <branch-or-full-sha>` in the committed, pushed Storefront UI publisher
checkout. `--shared-ref` selects shared independently; omitted refs default to
the documented initial pins. Verify the returned SHAs and checksum/manifest
URLs. Use its matching shared and Vue URLs in a temporary UI testing graph,
regenerate the lock in the container, test, then restore accepted pins. Rerun
for an advanced branch and pass the actual merged SHA after merge. No publisher
config/test commit or manually prepared tag is needed; retain old assets.

The two `@storefront-ui` dependencies use release assets from
`BudsiesApp/storefront-ui`. Download `release-manifest.json` and `SHA256SUMS`
alongside the archives, verify `sha256sum -c SHA256SUMS`, and confirm source
revisions separately from the packaging revision. The initial release is
`packages-37220-v1`: shared source `3ff374628936ba579a9bbb2a634c6c3ce9db6ac5`,
Vue source `b345b9cb261dabf1c105f4e6007fe7332ec8b6a4`.

For a newer release, update both dependency URLs to assets in the same tag,
run `docker compose exec app yarn install` and
`docker compose exec app node test/upgrade/storefront-ui-release-contract.js`,
and commit the manifest and generated lockfile on each app line. The packaged
Vue dependency must point to the same shared asset. Run the maintained checks
and builds for Petsies, Budsies, Budsies Education and Waggables on the main
app line and Bulk Orders on its separate app line. Do not remove historical
release assets or GitPkg URLs used by older revisions.
