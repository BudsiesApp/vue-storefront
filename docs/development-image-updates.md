# Development image updates

Renovate proposes newer prebuilt development image date tags in `docker-compose.yml`.
PR checks validate Compose, pull only the registered development images, and run
smoke fixtures. Merge requires the existing application checks as well as
`development-image-references`. Routine bot PRs use native auto-merge after rollout.

To adopt a merged update, pull your branch, then run:

```bash
docker compose pull
docker compose up -d --force-recreate
```

These commands use the recorded prebuilt tags without a local build. Keep your
usual local application configuration. VueStorefront theme branches adopt their
own PRs independently.

If a release fails, revert its image-reference PR to restore the previous tag,
then pull and recreate the container again. Confirm the old tag is still in ECR
before reverting; lifecycle retention can remove old images. Published version
tags are never deliberately overwritten. A failed check leaves the current
reference in place. Retry failed publication in the image repository, then rerun
Renovate to discover the available tag.
