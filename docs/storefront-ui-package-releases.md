# Storefront UI package releases

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
