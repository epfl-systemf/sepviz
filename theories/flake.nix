{
  description = "A nix-flake-based development environment with cfml & tlc";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachSystem
      [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ]
      (
        system:
        let
          overlay = final: prev: {
            tlc = final.callPackage ./.nix/coq-overlays/tlc {
              coqPackages = final.coqPackages_8_20;
            };
            cfml = final.callPackage ./.nix/coq-overlays/cfml {
              tlc = final.tlc;
              coqPackages = final.coqPackages_8_20;
            };
          };
          pkgs = import nixpkgs {
            inherit system;
            overlays = [ overlay ];
          };
          coqPkgs = pkgs.coqPackages_8_20;
        in
        {
          devShells.default = pkgs.mkShell {
            packages =
              with pkgs;
              [ python312Packages.alectryon ]
              ++ (with coqPkgs; [
                coq
                serapi
                tlc
                cfml
              ]);
          };
        }
      );
}
