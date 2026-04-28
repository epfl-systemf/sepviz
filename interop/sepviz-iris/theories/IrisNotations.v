From iris.heap_lang Require Import lang proofmode notation.

Declare Scope sepviz_scope.
Global Open Scope sepviz_scope.


(** ** Separation-logic formulas: heap props *)

Declare Custom Entry sep.
Declare Custom Entry val.

Notation "⟬ e ⟭" :=
  (e)
    (e custom sep at level 200, at level 0): sepviz_scope.

Notation "'Pure' ┆ P" :=
  (bi_pure P)
    (in custom sep at level 200,
     P constr at level 200): sepviz_scope.

Notation "'PointsTo' ┆ l ┆ ⟦ v ⟧ ┆ dq " :=
  (pointsto l dq v)
    (in custom sep at level 200,
     l constr, dq constr, v custom val at level 200): sepviz_scope.

Notation "'PointsTo' ┆ l ┆ ⟦ $Basic ┆ v ⟧ ┆ dq " :=
  (pointsto l dq v)
    (in custom sep at level 200,
     l constr, dq constr, v constr at level 200): sepviz_scope.

Notation "'PointsTo' ┆ l ┆ ⟦ $Pair ┆ v1 ┆ v2 ⟧ ┆ dq " :=
  (pointsto l dq (PairV v1 v2))
    (in custom sep at level 200,
     l constr, dq constr, v1 constr, v2 constr at level 200): sepviz_scope.

Notation "'Star' ┆ H1 ┆ H2" :=
  (bi_sep H1 H2)
    (in custom sep at level 200,
     H1 constr, H2 constr at level 200): sepviz_scope.

Notation "'Wand' ┆ P ┆ Q" :=
  (bi_wand P Q)
    (in custom sep at level 200,
     P constr, Q constr at level 200, only printing): sepviz_scope.

Notation "'Wand' ┆ P ┆ Q" :=
  (bi_emp_valid (bi_wand P Q))
    (in custom sep at level 200,
     P constr, Q constr at level 200, only printing): sepviz_scope.

Notation "'Modality' ┆ ▷ ┆ H" :=
  (bi_later H)
    (in custom sep at level 200,
     H constr at level 200): sepviz_scope.

Notation "'Exist' ┆ x ┆ H" :=
  (bi_exist (fun x => H))
    (in custom sep at level 200,
        x name,
        H constr at level 200): sepviz_scope.

Notation "'Forall' ┆ x ┆ H" :=
  (bi_forall (fun x => H))
    (in custom sep at level 200,
        x name,
        H constr at level 200): sepviz_scope.

Notation "'BigOp' ┆ ∗ ┆ k ↦ x ∈ l ┆ P" :=
  (big_opL bi_sep (λ k x, P%I) l)
    (in custom sep at level 200,
     k constr, x constr, l constr, P constr at level 200): sepviz_scope.
Notation "'BigOp' ┆ ∗ ┆ x ∈ l ┆ P" :=
  (big_opL bi_sep (λ _ x, P%I) l)
    (in custom sep at level 200,
     x constr, l constr, P constr at level 200): sepviz_scope.
Notation "'BigOp' ┆ ∗ ┆ ' ' ┆ Ps " :=
  (big_opL bi_sep (λ _ x, x) Ps%I)
    (in custom sep at level 200,
     Ps constr at level 200): sepviz_scope.
(* corresponding to: *)
(* Notation big_sepL := (big_opL bi_sep) (only parsing). *)
(* Notation "'[∗' 'list]' k ↦ x ∈ l , P" := (big_sepL (λ k x, P%I) l) : bi_scope. *)
(* Notation "'[∗' 'list]' x ∈ l , P" := (big_sepL (λ _ x, P%I) l) : bi_scope. *)
(* Notation "'[∗]' Ps" := (big_sepL (λ _ x, x) Ps%I) : bi_scope. *)


(** ** Separation-logic formulas: props *)

Notation "⟬* 'PRE' @ P *⟭ e 'RET' pat ; ⟬* 'POST' @ Q *⟭" :=
  (∀ Φ, P -∗ ▷ (Q -∗ Φ pat%V) -∗ WP e {{ Φ }})
    (format "'⟬*'  'PRE'  '@'  P  '*⟭' '//' e '//' 'RET'  pat ; '//' '⟬*'  'POST'  '@'  Q  '*⟭'"): sepviz_scope.

Notation "Γ ⟬* 'PRE' @ H : P *⟭" := (environments.Esnoc Γ (INamed H) P%I)
  (at level 1, P at level 200,
  left associativity, format "Γ ⟬*  PRE  @  H  :  P  *⟭ '//'", only printing) : sepviz_scope.

Notation "⟬* 'PRE' @ P *⟭ e ⟬* 'POST' @ x , 'RET' pat ; Q *⟭" :=
  (forall Φ,
   bi_emp_valid
     (bi_wand P
        (bi_wand (bi_later (bi_forall (fun x => bi_wand Q (Φ pat)))) (wp NotStuck top e Φ)))): sepviz_scope.

Notation "'Triple' ┆ e ┆ P ┆ x , 'RET' pat ; Q" :=
  (bi_intuitionistically
     (bi_forall
        (fun Φ =>
         bi_wand P
           (bi_wand (bi_later (bi_forall (fun x => bi_wand Q (Φ pat)))) (wp NotStuck top e Φ)))))
    (in custom sep at level 200,
     e constr, P constr, x name, pat constr, Q constr at level 200): sepviz_scope.

Section septest.
  Open Scope sepviz_scope.
  Context `{!heapGS Σ}.
  Parameter A B C: iProp Σ.
  Parameter P: Prop.
  (* Check (bi_sep A B). *)
  (* Check (bi_sep (bi_sep A C) B). *)
  (* Check (bi_wand A B). *)
  (* Check (bi_wand (bi_sep (bi_sep A A) B) (bi_pure P)). *)
End septest.

(** ** Values *)

Notation "⟦ e ⟧" :=
  (e)
    (e custom val at level 200, at level 0): sepviz_scope.

Notation "'$LitV' ┆ v " :=
  (LitV v)
    (in custom val at level 200,
     v constr at level 200): sepviz_scope.

Section valtest.
  Parameter x: val.
  (* Check (LitV 1). *)
  (* Check (InjLV x). *)
  (* Check (PairV (LitV 1) (LitV 2)). *)
  (* Check (PairV x (LitV 2)). *)
  (* Check (PairV x x). *)
  (* Check (PairV x (InjLV x)). *)
End valtest.
