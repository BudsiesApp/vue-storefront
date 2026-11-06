# VueStorefront development image and skill updates

Central Renovate proposes newer prebuilt app and tests image tags in
`docker-compose.yml`. Each of `petsies-theme` and `bulkorders-theme` receives its
own PR. Central Tool updates independently supplies generated OpenSpec skills;
a skills update does not wait for an image update.
See the [process overview](https://github.com/GorbunovStudio/budsies-docker-images-automation) for repository interactions.

## Adopt a merged update

From the repository root on your theme branch, pull its updates and recreate the
application and tests services using the committed image references:

```bash
git pull --ff-only
aws --profile budsies ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 472532368511.dkr.ecr.us-east-1.amazonaws.com
docker compose pull app tests
docker compose up -d --no-deps --force-recreate app tests
```

Keep your usual local configuration. No local image build is needed. Pulling the
branch also adopts merged generated skills; do not rerun OpenSpec generation to
adopt them.

## Consumer checks and setup

The **Development image references** workflow validates Compose, pulls the owned
images and runs smoke checks for relevant PRs. Unrelated PRs still receive a
successful `development-image-references` check. Manual runs check the current
references. The workflow publishes no images and does not generate OpenSpec files.

Land `.github/workflows/development-image-references.yml`,
`scripts/check-consumer-images.sh` and `scripts/smoke-dev-image.sh` on each target
branch. Set Actions repository variable `AWS_IMAGE_CHECK_ROLE_ARN` to the
Infrastructure stack's `ImageCheckReaderArn` output. Require status check
`development-image-references` on those branches; preserve existing required
application checks where configured. Allow squash merging and auto-merge.

The central updater requests auto-merge on its PRs. Regular PRs are not enrolled
in auto-merge by this automation. Required checks apply to all matching branch
updates, including direct pushes; configure human bypass access if needed.
Follow the central [deployment guide](https://github.com/GorbunovStudio/budsies-docker-images-automation/blob/master/docs/deployment.md)
for App installation, AWS access and ruleset settings.

## Rollback and retry

Before reverting an image-reference PR, confirm the previous ECR tag is available
and pullable. Revert the PR, pull the branch and recreate the affected containers.
ECR lifecycle retention can remove older tags. Published tags stay unchanged by
convention.

If an image check fails, correct the reference or resolve publication in the
[image repository](https://github.com/GorbunovStudio/budsies-docker-images), then
rerun the check. Run central Renovate manually to discover a newly published tag
without waiting for its next daily lookup.

Run the check on either branch manually:

```bash
gh workflow run development-image-references.yml --repo BudsiesApp/vue-storefront --ref petsies-theme
gh workflow run development-image-references.yml --repo BudsiesApp/vue-storefront --ref bulkorders-theme
```
