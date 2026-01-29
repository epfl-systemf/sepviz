#!/usr/bin/env bash
set -euo pipefail

if [[ -v USE_NIX ]]; then
    echo "[gen:proofs:lp] building logical-pinning proofs with direnv..."
    direnv exec ../../logical-pinning make USE_NIX=1 -C ../../logical-pinning sepviz
else
    echo "[gen:proofs:lp] building example proofs..."
    pushd ../../logical-pinning
    make -C ../../logical-pinning sepviz
    popd
fi

echo "[gen:proofs:lp] copying build output to public/"
cp -r ../../logical-pinning/_sepviz_build/* ./public/

echo "[gen:proofs:lp] done."
