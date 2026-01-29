#!/usr/bin/env bash
set -euo pipefail

if [[ -v USE_NIX ]]; then
    echo "[gen:proofs:vc] building vc proofs with direnv..."
    direnv exec ../../vc make USE_NIX=1 -C ../../vc sepviz
else
    echo "[gen:proofs:vc] building example proofs..."
    pushd ../../vc
    make sepviz
    popd
fi

echo "[gen:proofs:vc] copying build output to public/"
cp -r ../../vc/_sepviz_build/* ./public/

echo "[gen:proofs:vc] done."
