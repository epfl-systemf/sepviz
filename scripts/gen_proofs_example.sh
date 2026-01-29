#!/usr/bin/env bash
set -euo pipefail

if [[ -v USE_NIX ]]; then
    echo "[gen:proofs:example] building example proofs with direnv..."
    direnv exec ../cfml-examples make -C ../cfml-examples
else
    echo "[gen:proofs:example] building example proofs..."
    pushd ../cfml-examples
    make -C ../cfml-examples
    popd
fi

# echo "[gen:proofs:example] removing..."
# find public -mindepth 1 ! \( -name 'renderConfig.yaml' -o -name 'test-animation.html' -o -name 'test-animation.js' \) \
#     -print -exec rm -rf {} +

echo "[gen:proofs:example] copying build output to public/"
cp -r ../cfml-examples/_build/* ./public/

echo "[gen:proofs:example] done."
