# Separation Logic Diagram

### Environment

#### Option 1: nix-flakes

`nix build` will generate a shell with proper environment.

##### Bonus: direnv

If you have direnv installed, run `direnv allow` once and for all.

From now on, simply entering the project directory will load the proper environment automatically.


#### Option 2: opam

1. If you have never used opam before, run:

   ```bash
   opam init
   ```

2. Create a new switch to contain the relevant packages:

   ```bash
   opam switch create sepviz 4.14.2
   eval $(opam env)
   opam pin add coq 8.20.1
   opam install coq pprint menhir "coq-serapi>=8.10.0+0.7.0"
   ```

3. Install the TLC and CFML package:

   ```bash
   make prepare
   ```

4. Install Alectryon:

   ```bash
   python3 -m pip install alectryon
   ```



### Run the project

Set up the environment if you have not.

If you're using nix, run:

```bash
make USE_NIX=true
```
If you're using opam, run:

```bash
make
```

or

```bash
make USE_NIX=false
```

The generated html files are in `_build`.
