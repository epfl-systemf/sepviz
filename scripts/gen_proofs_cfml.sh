#!/usr/bin/env bash
set -euo pipefail

if [[ -v USE_NIX ]]; then
    echo "[gen:proofs:cfml] building cfml proofs with direnv..."
    direnv exec ./rocq-sources/cfml-examples make -C ./rocq-sources/cfml-examples
else
    echo "[gen:proofs:cfml] building cfml proofs..."
    pushd ./rocq-sources/cfml-examples
    make -C ./rocq-sources/cfml-examples
    popd
fi

echo "[gen:proofs:cfml] copying build output to public/"
cp -r ./rocq-sources/cfml-examples/_sepviz_build/* ./public/

echo "[gen:proofs:cfml] done."
