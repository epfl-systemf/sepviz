{
  lib,
  which,
  coqPackages,
  version ? null,
}:

with lib;
let
  inherit (coqPackages) mkCoqDerivation coq;
in
mkCoqDerivation {
  pname = "tlc";
  repo = "tlc";
  owner = "charguer";
  inherit version;
  defaultVersion = "master";
  release."master".sha256 = "sha256-NmOGykMUUdWgaHzbJGXP+DP5KM0XlomvzL8Wnn1/FkE=";
  # releaseRev = v: "${v}";
  buildInputs = [ ];
  propagatedBuildInputs = [ ];
  makeFlags = [ "CONTRIB=$(out)/lib/coq/${coq.coq-version}/user-contrib" ];
  meta = with lib; {
    homepage = "http://www.chargueraud.org/softs/tlc/";
    description = "Non-constructive library for Coq";
    license = licenses.mit;
  };
}
