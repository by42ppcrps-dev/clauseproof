#!/usr/bin/env bash
# Builds the sub-path bundle and force-pushes it to the gh-pages branch, which
# GitHub Pages serves at https://<owner>.github.io/<repo>/. Usage:
#   scripts/deploy-pages.sh            # uses the origin remote
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE_URL=$(git remote get-url origin)
REPO_NAME=$(basename -s .git "$REMOTE_URL")
OWNER=$(basename "$(dirname "$REMOTE_URL")" | sed 's/.*://')
VITE_BASE="/$REPO_NAME/" VITE_SITE_URL="https://$OWNER.github.io/$REPO_NAME" npm run build
cd dist/client
touch .nojekyll
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Deploy $REPO_NAME to GitHub Pages"
git push -f "$REMOTE_URL" gh-pages:gh-pages
rm -rf .git
echo "Deployed: https://$OWNER.github.io/$REPO_NAME/"
