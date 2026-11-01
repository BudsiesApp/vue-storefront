#!/usr/bin/env bash
set -euo pipefail
image=${1:?Expected image reference}
recipe=${2:?Expected magento, app, or tests}
platform=${3:-linux/amd64}
case "$recipe" in magento | app | tests) user=1000:1000 ;; *)
  echo 'Unknown smoke recipe' >&2
  exit 2
  ;;
esac
openspec_version=${OPENSPEC_VERSION:-$(docker image inspect --format '{{ index .Config.Labels "org.budsies.openspec-version" }}' "$image")}
codegraph_version=${CODEGRAPH_VERSION:-$(docker image inspect --format '{{ index .Config.Labels "org.budsies.codegraph-version" }}' "$image")}
docker run --rm -i --platform "$platform" --user "$user" --entrypoint /bin/sh \
  -e CI=true -e DO_NOT_TRACK=1 -e OPENSPEC_TELEMETRY=0 \
  "$image" -s -- "$recipe" "$openspec_version" "$codegraph_version" <<'SMOKE'
set -eu
recipe=$1
openspec_version=$2
codegraph_version=$3
fixture=$(mktemp -d /tmp/dev-image-smoke.XXXXXX)
trap 'rm -rf "$fixture"' EXIT
mkdir -p "$fixture/config" "$fixture/data"
export XDG_CONFIG_HOME="$fixture/config" XDG_DATA_HOME="$fixture/data"
printf 'fixture writable by uid %s\n' "$(id -u)" > "$fixture/write-check"
node --version
if [ "$recipe" = app ]; then
  yarn --version
  test -r "$fixture/write-check"
  exit 0
fi
test -n "$openspec_version" && test "$openspec_version" != '<no value>'
test -n "$codegraph_version" && test "$codegraph_version" != '<no value>'
test "$(openspec --version)" = "$openspec_version"
test "$(codegraph --version)" = "$codegraph_version"
mkdir "$fixture/project"
cd "$fixture/project"
# Initialization is confined to this disposable smoke fixture.
openspec init --tools codex --no-copilot-cloud --no-animation
openspec list --json > "$fixture/list.json"
node -e '
  const result = require(process.argv[1]);
  if (!result.root) {
    process.exit(1);
  }
' "$fixture/list.json"
openspec update
cat > smoke.js <<'SOURCE'
export function smokeFunction(input) { return input + 1; }
export function caller() { return smokeFunction(1); }
SOURCE
codegraph init --yes "$fixture/project"
codegraph query smokeFunction --path "$fixture/project" --json > "$fixture/query.json"
grep -q smokeFunction "$fixture/query.json"
test -d "$fixture/project/.codegraph"
printf 'Tool smoke passed as uid %s\n' "$(id -u)"
SMOKE
