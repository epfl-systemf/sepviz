From SLF Require Import LibSepReference.

Declare Scope sepviz_scope.
Global Open Scope sepviz_scope.


(** ** Separation-logic formulas: heap props *)

Declare Custom Entry sep.

Notation "⟬  e  ⟭" :=
  (e)
    (e custom sep at level 200, at level 0): sepviz_scope.

Notation "'Pure' ┆ P" :=
  (hpure P)
    (in custom sep at level 200,
     P constr at level 200): sepviz_scope.

Notation "'PointsTo' ┆ p ┆ ⟦ '$hsingle' ┆ x ⟧" :=
  (hsingle p x)
    (in custom sep at level 200,
        p constr, x constr at level 200): sepviz_scope.

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

Notation "'IfThenElse' ┆ ⟬ 'Pure' ┆ P ⟭ ┆ v1 ┆ v2" :=
  (if classicT P then v1 else v2)
    (in custom sep at level 200,
     P constr, v1 constr, v2 constr at level 200): sepviz_scope.


(** ** Separation-logic formulas: props *)

Notation "'SPEC' t ⟬* 'PRE' @ H *⟭ ⟬* 'POST' @ Q *⟭" :=
  (triple t H Q)
    (at level 200,
     t constr, H constr, Q constr at level 200,
     format "'SPEC'  t '//' '⟬*'  'PRE'  '@'  H  '*⟭' '//' '⟬*'  'POST'  '@'  Q  '*⟭'"): sepviz_scope.

Notation "⟬* 'PRE' @ H *⟭ 'CODE' F ⟬* 'POST' @ Q *⟭" :=
  (himpl H (mkstruct F Q))
    (at level 200,
     H constr, F constr, Q constr at level 200,
     format "'⟬*'  'PRE'  '@'  H  '*⟭' '//' 'CODE'  F '//' '⟬*'  'POST'  '@'  Q  '*⟭'"): sepviz_scope.

(* For continuous animation *)
Notation "⟬* 'PRE' @ H1 '*⟭' ==> ⟬* 'POST' @ H2 *⟭" :=
  (himpl H1 H2)
    (at level 200,
     H1 constr at level 200,
     H2 constr at level 200,
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

Declare Custom Entry val.

Notation "⟦ e ⟧" :=
  (e)
    (e custom val at level 200, at level 0): sepviz_scope.


(** ** slf framework specific *)

Notation "'PointsTo' ┆ p ┆ ⟦ x ⟧" :=
  (hrecord x p)
    (in custom sep at level 200,
     p constr, x custom val at level 200): sepviz_scope.

Notation "'$Record2_val' ┆ k1 ┆ v1 ┆ k2 ┆ v2" :=
  ((k1,(v1:val))::(k2,(v2:val))::nil)
    (in custom val at level 200,
     k1 constr, k2 constr, v1 constr, v2 constr at level 200): sepviz_scope.

Notation "'$Record2' ┆ k1 ┆ v1 ┆ k2 ┆ v2" :=
  ((k1,v1)::(k2,v2)::nil)
    (in custom val at level 200,
     k1 constr, k2 constr, v1 constr, v2 constr at level 200): sepviz_scope.

Notation "'$Record3_val' ┆ k1 ┆ v1 ┆ k2 ┆ v2 ┆ k3 ┆ v3" :=
  ((k1,(v1:val))::(k2,(v2:val))::(k3,(v3:val))::nil)
    (in custom val at level 200,
     k1 constr, k2 constr, k3 constr, v1 constr, v2 constr, v3 constr at level 200): sepviz_scope.

Notation "'$Record3' ┆ k1 ┆ v1 ┆ k2 ┆ v2 ┆ k3 ┆ v3" :=
  ((k1,v1)::(k2,v2)::(k3,v3)::nil)
    (in custom val at level 200,
     k1 constr, k2 constr, k3 constr, v1 constr, v2 constr, v3 constr at level 200): sepviz_scope.
