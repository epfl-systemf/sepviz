#!/usr/bin/env bash
set -euo pipefail

if [[ -v USE_NIX ]]; then
    echo "[gen:proofs:iris] building iris proofs with direnv..."
    direnv exec ../iris-tutorial make USE_NIX=1 -C ../iris-tutorial sepviz
else
    echo "[gen:proofs:iris] building iris proofs..."
    pushd ../iris-tutorial
    make sepviz
    popd
fi

echo "[gen:proofs:iris] copying build output to public/"
cp -r ../iris-tutorial/_sepviz_build/* ./public/

echo "[gen:proofs:iris] done."
