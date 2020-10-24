#!/usr/bin/env sh
opam switch create coq-latest 4.09.0
eval $(opam env)
OPAMYES=1 opam repo add coq-released https://coq.inria.fr/opam/released
OPAMYES=1 opam install coq coq-serapi
