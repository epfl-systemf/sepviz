#!/usr/bin/env bash
set -euo pipefail

if [[ -v USE_NIX ]]; then
    echo "[gen:proofs:iris] building iris proofs with direnv..."
    direnv exec ./rocq-sources/iris-example make USE_NIX=1 -C ./rocq-sources/iris-example sepviz
else
    echo "[gen:proofs:iris] building iris proofs..."
    pushd ./rocq-sources/iris-example
    make sepviz
    popd
fi

echo "[gen:proofs:iris] copying build output to public/"
cp -r ./rocq-sources/iris-example/_sepviz_build/* ./public/

echo "[gen:proofs:iris] done."
