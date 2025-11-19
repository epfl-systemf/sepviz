#[warnings="-notation-overridden -ambiguous-paths -notation-incompatible-prefix"]
From CFML Require Export WPLib.
Require Export WPUntyped.

Declare Custom Entry heap.
Notation "{*  e  *}" := (e) (e custom heap at level 200, at level 0).

Notation "H1 ★ H2" :=
  (hstar H1 H2)
    (in custom heap at level 41,
        H2 custom heap at level 41).
Notation "[*  P  *]" :=
  (hpure P)
    (in custom heap at level 40,
        P custom heap at level 40).
Notation "x ~> S" :=
  (repr S x)
    (in custom heap at level 33,
        x custom heap,
        S custom heap at level 32).
Notation "'llet' x := a 'in' v" := ((fun x => v) a) (at level 200).
Notation "∃  x ,  P" :=
  (hexists (fun x => P))
    (in custom heap at level 200, P custom heap at level 200).
Notation "( x )" := (x) (in custom heap at level 0, x custom heap at level 200).
Notation "x" := (x) (in custom heap at level 0, x constr at level 200).
