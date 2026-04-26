#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../public"

INJECTION="$(
    cat <<'EOF'
<link rel="stylesheet" href="../alectryon-viz.css" type="text/css" />
<script type="module" src="../alectryon-viz.js"></script>
EOF
)"

echo "[inject] injecting viz css and js into html files..."

if [[ ! -d "$PUBLIC_DIR" ]]; then
    echo "[inject] creating the public folder..."
    mkdir -p $PUBLIC_DIR
fi

find "$PUBLIC_DIR" -type f \( -name '*.html' \) -print0 |
    while IFS= read -r -d '' FILE; do
        # skip if already injected
        if grep -q 'alectryon-viz.js' "$FILE" && grep -q 'href="alectryon-viz.css"' "$FILE"; then
            continue
        fi

        TMP="${FILE}.tmp.$$"

        awk -v inj="$INJECTION" '
    BEGIN { inserted = 0 }
    {
      line = $0
      lower = tolower(line)
      if (lower ~ /<\/head>/ && !inserted) { print inj; inserted = 1 }
      if (lower ~ /<\/html>/ && !inserted) { print inj; inserted = 1 }
      print line
    }
    END { if (!inserted) print inj }
  ' "$FILE" >"$TMP"

        mv "$TMP" "$FILE"
        echo "[inject] Injected into: $FILE"
    done

echo "[inject] done."
