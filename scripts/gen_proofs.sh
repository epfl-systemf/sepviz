#!/usr/bin/env sh
set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <project> [project2 ...]"
    echo "Example: $0 cfml-examples iris-example software-foundations-slf"
    exit 1
fi

PUBLIC_DIR="./public"
MAKE_GOAL="sepviz"

for PROJECT in "$@"; do
    BASE_DIR="./rocq-sources/${PROJECT}"
    BUILD_DIR="${BASE_DIR}/_sepviz_build"

    echo "${PROJECT}: starting build..."

    if [[ ! -d "$BASE_DIR" ]]; then
        echo "${PROJECT}: ERROR: directory '$BASE_DIR' does not exist."
        exit 1
    fi

    echo "${PROJECT}: building proofs..."
    if [[ -v USE_NIX ]]; then
        direnv exec "$BASE_DIR" make -C "$BASE_DIR" "$MAKE_GOAL"
    else
        pushd "$BASE_DIR" >/dev/null
        make "$MAKE_GOAL"
        popd >/dev/null
    fi

    echo "${PROJECT}: copying build output..."
    cp -r "${BUILD_DIR}/"* "$PUBLIC_DIR/"

    echo "${PROJECT}: done."
    echo
done

echo "All projects built successfully."
