#!/usr/bin/env bash
set -euo pipefail
kind=${1:?Expected magento or vue}
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
# The check needs no application secrets; provide harmless values for Compose
# interpolation and do not print the fully resolved application configuration.
export DOMAIN=ci.invalid LETSENCRYPT_EMAIL=ci@example.invalid SSH_AUTH_SOCK=/tmp/ci-ssh-agent
export SOURCES_PATH=/tmp/ci-sources MYSQL_BIND_PORT=3306 MYSQL_DATABASE=ci MYSQL_USER=ci MYSQL_PASSWORD=ci
export COMPOSER_AUTH='{}' XDEBUG_CLIENT_HOST=host.docker.internal XDEBUG_CLIENT_PORT=9003 XDEBUG_DISCOVER_CLIENT_HOST=0
export HOST_UID=1000 HOST_GID=1000 USER_UID=1000 USER_GID=1000
registry=472532368511.dkr.ecr.us-east-1.amazonaws.com
case "$kind" in
  magento)
    image_names=(budsies.com/store/m2/dev/php/fpm)
    recipes=(magento)
    ;;
  vue)
    image_names=(budsies.com/store/ui/dev/app budsies.com/store/ui/dev/tests)
    recipes=(app tests)
    ;;
  *)
    echo 'Unknown consumer kind' >&2
    exit 2
    ;;
esac
docker compose --env-file /dev/null -f docker-compose.yml config --quiet
images=$(docker compose --env-file /dev/null -f docker-compose.yml config --images)
for index in "${!image_names[@]}"; do
  prefix="$registry/${image_names[$index]}:"
  selected_images=()
  while IFS= read -r image; do
    [[ "$image" == "$prefix"* ]] && selected_images+=("$image")
  done <<<"$images"
  if [[ ${#selected_images[@]} -ne 1 ]]; then
    echo "Expected exactly one prebuilt ${image_names[$index]} reference" >&2
    exit 1
  fi
  image=${selected_images[0]}
  tag=${image#"$prefix"}
  if [[ ! "$tag" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}(\.[0-9]+(\.[0-9]+)?)?$ ]]; then
    echo 'Expected an owned image date tag without a digest' >&2
    exit 1
  fi
  docker pull --platform linux/amd64 "$image"
  bash scripts/smoke-dev-image.sh "$image" "${recipes[$index]}" linux/amd64
done
