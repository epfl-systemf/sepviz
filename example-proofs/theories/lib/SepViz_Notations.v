#[warnings="-notation-overridden -ambiguous-paths -notation-incompatible-prefix"]
From CFML Require Import WPLib.

Declare Custom Entry sepviz_heap.
Notation "{*  e  *}" :=
  (e)
  (e custom sepviz_heap at level 200, at level 0).

Notation "H1 ★ H2" :=
  (hstar H1 H2)
    (in custom sepviz_heap at level 41,
     H2 custom sepviz_heap at level 41).
Notation "⌜  P  ⌝" :=
  (hpure P)
    (in custom sepviz_heap at level 40,
      P custom sepviz_heap at level 40).
Notation "H1 -∗ H2" :=
  (hwand H1 H2)
    (in custom sepviz_heap at level 40, right associativity).
Notation "x ~> S" :=
  (repr S x)
    (in custom sepviz_heap at level 33,
      x custom sepviz_heap,
      S custom sepviz_heap at level 32).
Notation "'llet' x := a 'in' v" := ((fun x => v) a) (at level 200).
Notation "∃  x ,  P" :=
  (hexists (fun x => P))
    (in custom sepviz_heap at level 200,
      P custom sepviz_heap at level 200).
Notation "( x )" :=
  (x)
  (in custom sepviz_heap at level 0,
    x custom sepviz_heap at level 200).
Notation "x" :=
  (x)
  (in custom sepviz_heap at level 0,
    x constr at level 200).
