#!/usr/bin/env bash
set -euo pipefail

LEVEL=${1:-patch}
ROOT="$(dirname "$0")/.."
cd "$ROOT"

# Read current version from core
CURRENT=$(node -p "require('./packages/core/package.json').version")

# Compute new version
VERSION=$(node -e "
  const [major, minor, patch] = '${CURRENT}'.split('.').map(Number);
  const level = '${LEVEL}';
  if (level === 'major') console.log(\`\${major+1}.0.0\`);
  else if (level === 'minor') console.log(\`\${major}.\${minor+1}.0\`);
  else console.log(\`\${major}.\${minor}.\${patch+1}\`);
")

echo "Bumping ${CURRENT} → ${VERSION}"

# Update version in all three packages
for pkg in core web react-native; do
  node -e "
    const fs = require('fs');
    const path = './packages/${pkg}/package.json';
    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
    pkg.version = '${VERSION}';
    if (pkg.dependencies && pkg.dependencies['@jambonz/client-sdk-core']) {
      pkg.dependencies['@jambonz/client-sdk-core'] = '${VERSION}';
    }
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  "
done

# Commit and tag
git add packages/*/package.json
git commit -m "v${VERSION}"
git tag "v${VERSION}"
git push && git push --tags

echo "Tagged v${VERSION} — publish workflow will run automatically."
