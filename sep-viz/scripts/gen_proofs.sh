#!/usr/bin/env bash
set -euo pipefail

echo "[gen:proofs] building example proofs with direnv..."
direnv exec ../example-proofs make -C ../example-proofs

echo "[gen:proofs] removing..."
find public -mindepth 1 ! -name 'renderConfig.yaml' \
    -print -exec rm -rf {} +

echo "[gen:proofs] copying build output to public/"
cp -r ../example-proofs/_build/* ./public/

echo "[gen:proofs] done."
