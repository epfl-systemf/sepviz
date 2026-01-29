#!/usr/bin/env bash
set -euo pipefail

if [[ -v USE_NIX ]]; then
    echo "[gen:proofs:slf] building slf proofs with direnv..."
    direnv exec ./rocq-sources/software-foundations-slf make USE_NIX=1 -C ./rocq-sources/software-foundations-slf sepviz
else
    echo "[gen:proofs:slf] building example proofs..."
    pushd ./rocq-sources/software-foundations-slf
    make sepviz
    popd
fi

echo "[gen:proofs:slf] copying build output to public/"
cp -r ./rocq-sources/software-foundations-slf/_sepviz_build/* ./public/

echo "[gen:proofs:slf] done."
