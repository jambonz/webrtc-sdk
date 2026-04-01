#!/usr/bin/env bash
set -euo pipefail

LEVEL=${1:-patch}
ROOT="$(dirname "$0")/.."
cd "$ROOT"

# Bump core and capture the new version
VERSION=$(cd packages/core && npm version "$LEVEL" --no-git-tag-version | tr -d 'v')

# Bump web and react-native to same version
cd packages/web
npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null
cd ../react-native
npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null
cd "$ROOT"

# Update cross-dependency on core
sed -i '' "s/\"@jambonz\/client-sdk-core\": \".*\"/\"@jambonz\/client-sdk-core\": \"$VERSION\"/" \
  packages/web/package.json packages/react-native/package.json

# Commit and tag
git add packages/*/package.json
git commit -m "v${VERSION}"
git tag "v${VERSION}"
git push && git push --tags

echo "Tagged v${VERSION} — publish workflow will run automatically."
