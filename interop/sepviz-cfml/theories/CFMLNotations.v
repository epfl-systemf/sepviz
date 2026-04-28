From CFML Require Import WPLib.

Declare Scope sepviz_scope.
Global Open Scope sepviz_scope.


(** ** Separation-logic formulas: heap props *)

Declare Custom Entry sep.
Declare Custom Entry val.

Notation "⟬  e  ⟭" :=
  (e)
    (e custom sep at level 200, at level 0): sepviz_scope.

Notation "'Pure' ┆ P" :=
  (hpure P)
    (in custom sep at level 200,
     P constr at level 200): sepviz_scope.

Notation "'PointsTo' ┆ x ┆ ⟦ S ⟧" :=
  (repr S x)
    (in custom sep at level 200,
        x constr, S custom val at level 200): sepviz_scope.

Notation "'Star' ┆ H1 ┆ H2" :=
  (hstar H1 H2)
    (in custom sep at level 200,
     H1 constr, H2 constr at level 200): sepviz_scope.

Notation "'Wand' ┆ H1 ┆ H2" :=
  (hwand H1 H2)
    (in custom sep at level 200,
     H1 constr, H2 constr at level 200): sepviz_scope.

Notation "'Exist' ┆ x ┆ P" :=
  (hexists (fun x => P))
    (in custom sep at level 200,
     x name, (* necessary for binder *)
     P constr at level 200): sepviz_scope.

Notation "'Opaque' ┆ 'GC'" :=
  (hgc)
    (in custom sep at level 200): sepviz_scope.

Notation "'Opaque' ┆ 'emp'" :=
  (hempty)
    (in custom sep at level 200): sepviz_scope.


(** ** Separation-logic formulas: props *)

Notation "'SPEC' t ⟬* 'PRE' @ H *⟭ ⟬* 'POST' @ Q *⟭" :=
  (Triple t H Q)
    (at level 200,
     t constr, H constr, Q constr at level 200,
     only printing,
     format "'SPEC'  t '//' '⟬*'  'PRE'  '@'  H  '*⟭' '//' '⟬*'  'POST'  '@'  Q  '*⟭'"): sepviz_scope.

Notation "⟬* 'PRE' @ H *⟭ 'CODE' F ⟬* 'POST' @ Q *⟭" :=
  (himpl H (F _ _ Q))
    (at level 200,
     H constr,
     F custom cf at level 0,
     Q constr at level 200,
     format "'⟬*'  'PRE'  '@'  H  '*⟭' '//' 'CODE'  F '//' '⟬*'  'POST'  '@'  Q  '*⟭'"): sepviz_scope.

(* For continuous animation *)
Notation "⟬* 'PRE' @ H1 *⟭ ==> ⟬* 'POST' @ H2 *⟭" :=
  (himpl H1 H2)
    (at level 200,
     H1 constr, H2 constr at level 200,
     format "'⟬*'  'PRE'  '@'  H1  '*⟭' '==>' '⟬*'  'POST'  '@'  H2  '*⟭'"): sepviz_scope.


(** ** Disabled notations *)

Notation "Q \*+ H" := (fun x => hstar (Q x) H) (only parsing): heap_scope.

Section septest.
  Open Scope sepviz_scope.
  Parameter A B C: hprop.
  Parameter P: Prop.
  Check (hstar A B).
  Check (hstar (hstar A C) B).
  Check (hwand A B).
  Check (hwand (hstar (hstar A A) B) (hpure P)).
End septest.


(** ** Values *)

Notation "⟦ e ⟧" :=
  (e)
    (e custom val at level 200, at level 0): sepviz_scope.
