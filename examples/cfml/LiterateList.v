(*|
.. coq:: none
|*)

#[warnings="-notation-overridden -ambiguous-paths -notation-incompatible-prefix"]
From Sepviz Require Import WPUntyped CFMLNotations.
From Sepviz.Examples.CFML Require Import ListNull.

Lemma nat_to_Z_sub: forall n,
  nat_to_Z (S n) - 1 = nat_to_Z n.
Proof. math. Qed.
Hint Rewrite nat_to_Z_sub: rw.
Hint Rewrite length_nil length_cons nth_succ app_nil_l: rw.
Hint Rewrite dyn_to_val_dyn_make: rw.

Ltac auto_star ::=
  autorewrite with rw in *;
  try easy;
  try solve [ intuition eauto with maths ].
Ltac auto_tilde ::=
  intros; subst; try auto_star.

Implicit Types (p q f b: loc).

Fixpoint MList (L: list Z) p :=
  match L with
  | nil => \[p = null]
  | x :: L' => \exists q, p ~> MCell x q \* q ~> MList L'
  end.
Arguments MList: simpl never.

Notation "'$MList' ┆ x " :=
  (MList x)
    (in custom val at level 200,
     x constr at level 200): sepviz_scope.

Lemma MList_nil: forall p, p ~> MList nil = \[p = null].
Proof. reflexivity. Qed.

Lemma MList_cons: forall p x L, p ~> MList (x :: L) = \exists q, p ~> MCell x q \* q ~> MList L.
Proof. reflexivity. Qed.

Lemma MList_cons_not_null: forall p x L, p ~> MList (x :: L) ==> p ~> MList (x :: L) \* \[p <> null].
Proof. intros. rewrite MList_cons; xpull; intros q.
  Transparent repr hfield.
  unfold MCell, repr, Hfield, hfield. xsimpl*.
Qed.

Section ListApiImpl.

  Import NotationForVariables.
  Import NotationForTerms.

  Definition is_empty :=
    Fun 'p := 'p '= null.

  Definition get_elem :=
    Fun 'p := (val_get_field head) 'p.

  Definition get_next :=
    Fun 'p := (val_get_field tail) 'p.

  Definition set_elem :=
    Fun 'p 'x := (val_set_field head) 'p 'x.

  Definition set_next :=
    Fun 'p 'q := (val_set_field tail) 'p 'q.

  Definition size :=
    Fix 'f 'p :=
      If_ 'not (is_empty 'p) Then ('f (get_next 'p) '+ 1) Else 0.

  Definition nth: val :=
    Fix 'f 'p 'n :=
      If_ 'n '= 0%nat Then get_elem 'p Else 'f (get_next 'p) ('n '- 1).

  (* append, requires [l1 <> nil] *)
  Definition append_aux :=
    Fix 'f 'p1 'p2 :=
      Let 'q := get_next 'p1 in
      If_ (is_empty 'q) Then set_next 'p1 'p2
      Else 'f 'q 'p2.

  Definition append: val :=
    Fix 'f 'p1 'p2 :=
      If_ (is_empty 'p1) Then 'p2
      Else (append_aux 'p1 'p2 '; 'p1).

End ListApiImpl.

(*||*)

Lemma Triple_is_empty: forall p L,
  Triple (is_empty p)
    (p ~> MList L)
    (fun (r: bool) => \[r = isTrue (L = nil)] \* p ~> MList L).
Proof.
  xwp. mxapp Triple_eq_val. destruct L; rewrite isTrue_eq_isTrue_eq.
  - rewrite MList_nil. xsimpl*.
  - xchanges~ MList_cons_not_null. firstorder; congruence.
Qed.

Lemma Triple_get_elem: forall p x L,
  Triple (get_elem p)
    (p ~> MList (x :: L))
    (fun (r: Z) => \[r = x] \* p ~> MList (x :: L)).
Proof.
  xwp. xchange MList_cons; intros q.
  mxapp ListNull.Triple_get_head.
  xchanges* <- MList_cons.
Qed.

Lemma Triple_get_next: forall p x L,
  Triple (get_next p)
    (p ~> MList (x :: L))
    (fun (q: loc) => p ~> MCell x q \* q ~> MList L).
Proof.
  xwp. xchange MList_cons; intros q.
  mxapp ListNull.Triple_get_tail. xsimpl*.
Qed.

Lemma Triple_set_elem: forall p x x' L,
  Triple (set_elem p ``x')
    (p ~> MList (x :: L))
    (fun (_: unit) => p ~> MList (x' :: L)).
Proof.
  xwp. xchange MList_cons; intros q.
  mxapp ListNull.Triple_set_head.
  xchanges <- MList_cons.
Qed.

Lemma Triple_set_next: forall p q' x L,
  Triple (set_next p ``q')
    (p ~> MList (x :: L))
    (fun (_: unit) => p ~> MCell x q' \* \exists q, q ~> MList L).
Proof.
  xwp. xchange MList_cons; intros q.
  mxapp ListNull.Triple_set_tail. xsimpl.
Qed.

Lemma Triple_size: forall L p,
  Triple (size p)
    (p ~> MList L)
    (fun (r: Z) => \[r = length L] \* p ~> MList L).
Proof.
  induction L as [| x L IH];
    xwp;
    mxapp Triple_is_empty; mxapp Triple_neg; xif; intros; try easy; try solve [mxvals*].
  mxapp Triple_get_next; intros q. mxapp IH. mxapp Triple_add.
  xchanges* <- MList_cons.
Qed.

Lemma Triple_nth: forall L n p,
  n < length L ->
  Triple (nth p (nat_to_Z n))
    (p ~> MList L)
    (fun (r: Z) => \[r = LibList.nth n L] \* p ~> MList L).
Proof.
  induction L;
    simpl; [rewrite length_nil; solve [math] |].
  xwp. mxapp Triple_eq_val; auto_star.
  destruct n; xif; subst; simpl; try easy; intros _.
  - mxapp Triple_get_elem; xsimpl*.
  - mxapp Triple_get_next; intros q.
    mxapp* Triple_sub. mxapp* IHL.
    xchange <- MList_cons. xsimpl*.
Qed.

Lemma Triple_append_aux: forall p1 L1 p2 L2,
  L1 <> nil ->
  Triple (append_aux p1 p2)
    (p1 ~> MList L1 \* p2 ~> MList L2)
    (fun (_: unit) => p1 ~> MList (L1++L2)).
Proof.
  intros p1 L1; gen p1.
  induction L1 as [| x L1]; [easy |].
  xwp. mxapp Triple_get_next; intros q.
  mxapp Triple_is_empty.
  destruct L1; xif; try easy; intros _.
  - xchange <- MList_cons. mxapp~ Triple_set_next.
    xchange~ MList_nil. xchanges <- MList_cons.
  - mxapp* IHL1. xchanges <- MList_cons.
Qed.

Lemma Triple_append: forall p1 L1 p2 L2,
  Triple (append p1 p2)
    (p1 ~> MList L1 \* p2 ~> MList L2)
    (fun (r: loc) => r ~> MList (L1++L2) \* \[L1 <> nil -> r = p1]).
Proof.
  xwp.
  mxapp Triple_is_empty.
  destruct L1; xif; intros; try easy.
  - xchange~ MList_nil. mxvals*.
  - mxapp* Triple_append_aux. mxvals*.
Qed.

(*|
.. coq:: none
|*)

Ltac auto_star ::= auto_star_default.
Ltac auto_tilde ::= auto_tilde_default.

(*|
.. raw:: html

   <link rel="stylesheet" href="../sepviz-alectryon.css" />
   <script type="module" src="../sepviz-alectryon.js"></script>
|*)
