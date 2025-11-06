{
  lib,
  which,
  bash,
  tlc,
  coqPackages,
  ...
}:

with lib;
let
  inherit (coqPackages) mkCoqDerivation coq;
in
mkCoqDerivation {
  pname = "cfml";
  # owner = "charguer";
  # repo = "cfml";
  # version = "master";
  # release."master".sha256 = "sha256-Axn7S7pVRkqY5I4Ler3vLRbKFTYwGcH+ThQYoqP2erU=";

  # How to fetch from url:
  version = "dev";
  src = builtins.fetchGit {
    url = "git@github.com:yawen-guan/cfml.git"; # Use ssh for the private repo.
    ref = "dev";
    rev = "72f8dbbff7a916d1b236b8909c2bdccb288cab85";
    # Fetch submodules so CFML examples will be compiled in the build phase.
    # For faster compilation, set `submodules` to `false`.
    # submodules = true;
  };

  # How to fetch local files:
  # src = ~/Repos/cfml;

  buildInputs = [ bash ];
  propagatedBuildInputs = [
    tlc
  ]
  ++ (with coq.ocamlPackages; [
    ocaml
    dune_3
    findlib # Note: [findlib] is necessary for [dune] to find [pprint].
    pprint
    menhir
  ]);

  # Sometimes the shebang line (#!/usr/bin/env bash) might not be correctly
  # interpreted in the Nix environment. Use patchShebangs to ensure that the
  # script uses the correct interpreter.
  preConfigure = ''
    patchShebangs .
    substituteInPlace Makefile --replace "/bin/bash" "${bash}/bin/bash"

    # Comment out the unnecessary use of [cfml_config] in [cfmlc.ml], otherwise
    # the generated executable [cfmlc.exe] requires to be found in relative
    # path [./_build/generator/default/cfmlc.exe].
    sed -i '48,49s/^/(* /; 48,49s/$/ *)/' generator/cfmlc.ml
    sed -i '82,85s/^/(* /; 82,85s/$/ *)/' generator/cfmlc.ml
  '';

  buildPhase = ''
    make depend
    make -j all
  '';

  installPhase =
    let
      cfml = "$out/lib/coq/${coq.coq-version}/user-contrib/CFML/";
      cfml-stdlib = "$out/lib/coq/${coq.coq-version}/user-contrib/CFML/Stdlib/";
      cfmlc-exe = "$out/bin/cfmlc.exe";
      cfmlc-wrap = "$out/bin/cfmlc";
    in
    ''
      # Install cfml and stdlib as coq libraries.
      mkdir -p ${cfml} ${cfml-stdlib}
      cp -r lib/coq/. ${cfml}
      cp -r lib/stdlib/. ${cfml-stdlib}

      # Install cfmlc.exe.
      mkdir -p $out/bin
      cp -r _build/default/generator/cfmlc.exe ${cfmlc-exe}

      # Create a wrapper script for cfmlc.exe.
      cat > ${cfmlc-wrap} <<EOF
      #!/usr/bin/env bash
      exec ${cfmlc-exe} -I ${cfml-stdlib} "\$@"
      EOF
      chmod +x ${cfmlc-wrap}
    '';

  meta = {
    description = "CFML: a framework for interactive proofs of ML programs in Separation Logic";
    homepage = "http://www.chargueraud.org/softs/cfml/";
    license = licenses.cc-by-40;
  };
}
