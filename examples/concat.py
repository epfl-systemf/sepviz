#!/usr/bin/env python3
# Concatenate ``sepviz.yaml`` files
import sys, yaml

out = {}
for path in sys.argv[1:]:
    data = yaml.safe_load(open(path)) or {}
    for k, v in data.items():
        if isinstance(v, dict):
            out.setdefault(k, {}).update(v)
        else:
            out[k] = v
yaml.safe_dump(out, sys.stdout, sort_keys=False, allow_unicode=True)
