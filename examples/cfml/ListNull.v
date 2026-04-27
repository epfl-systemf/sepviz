From Sepviz Require Import WPUntyped CFMLNotations.

Implicit Types (p q: loc).

Ltac auto_tilde ::=
  intros; subst; try solve [ intuition eauto with maths ].

Definition head : field := 0%nat.
Definition tail : field := 1%nat.

Definition MCell [A] `{EA: Enc A} (x: A) q p: hprop :=
  (p`.head ~~> ``x) \* (p`.tail ~~> ``q).

Notation "'$MCell' ┆ x1 ┆ x2 " :=
  (MCell x1 x2)
    (in custom val at level 200,
     x1 constr, x2 constr at level 200): sepviz_scope.

Local Transparent repr Hfield hfield.

Section MCellTriples.

  Context [A: Type] `{EA: Enc A} (v: A) (q p: loc).

  Lemma Triple_get_head:
    Triple ((val_get_field head) p)
      (p ~> MCell v q)
      (fun (r: A) => \[r = v] \* (p ~> MCell v q)).
  Proof using. intros. unfold repr, MCell. xapplys* Triple_get_field. Qed.

  Lemma Triple_get_tail:
    Triple ((val_get_field tail) p)
      (p ~> MCell v q)
      (fun (r: loc) => \[r = q] \* (p ~> MCell v q)).
  Proof using. intros. unfold repr, MCell. xapplys* Triple_get_field. Qed.

  Lemma Triple_set_head: forall (v': A),
    Triple ((val_set_field head) p ``v')
      (p ~> MCell v q)
      (fun (r: unit) => p ~> MCell v' q).
  Proof using. intros. unfold repr, MCell. xapplys* Triple_set_field. Qed.

  Lemma Triple_set_tail: forall (q': loc),
    Triple ((val_set_field tail) p ``q')
      (p ~> MCell v q)
      (fun (r: unit) => p ~> MCell v q').
  Proof using. intros. unfold repr, MCell. xapplys* Triple_set_field. Qed.

End MCellTriples.

Lemma MCell_conflict : forall p1 p2 A `{EA: Enc A} (x1 x2: A) (q1 q2: loc),
  p1 ~> MCell x1 q1 \* p2 ~> MCell x2 q2 ==+> \[p1 <> p2].
Proof using.
  intros. tests: (p1 = p2).
  - unfold repr, MCell, Hfield. xchange hstar_hfield_same_loc.
  - xsimpl*.
Qed.
Global Arguments MCell_conflict: clear implicits.

Fixpoint MListSeg [A] `{EA: Enc A} q (L: list A) p: hprop :=
  match L with
  | nil => \[p = q]
  | x::L' => \exists (p':loc), (p ~> MCell x p') \* (p' ~> MListSeg q L')
  end.

Notation "'$MListSeg' ┆ x1 ┆ x2 " :=
  (MListSeg x1 x2)
    (in custom val at level 200,
     x1 constr, x2 constr at level 200): sepviz_scope.

Section MListSegLemmas.

  Context [A: Type] `{EA: Enc A}.
  Implicit Types (x: A) (L: list A).

  Lemma MListSeg_nil: forall p q,
    p ~> (MListSeg q (@nil A)) = \[p = q].
  Proof using. intros. xunfold~ MListSeg. Qed.

  Lemma MListSeg_cons: forall p q x L,
    p ~> MListSeg q (x::L) =
    \exists (p':loc), (p ~> MCell x p') \* p' ~> MListSeg q L.
  Proof using. intros. xunfold~ MListSeg. Qed.

  Lemma MListSeg_nil_intro: forall p,
    \[] = p ~> MListSeg p (@nil A).
  Proof using. intros. rewrite MListSeg_nil. xsimpl*. Qed.

  Lemma MListSeg_MCell_conflict: forall p q x L q',
    p ~> MListSeg q L \* q ~> MCell x q' ==+> \[L = nil <-> p = q].
  Proof using.
    intros. destruct L.
    - xchanges* MListSeg_nil. split*.
    - xchange MListSeg_cons ;=> p'. tests: (p = q).
      + xchange MCell_conflict.
      + xsimpl; [split*; intros H; invert H | xchange <- MListSeg_cons].
  Qed.

  Lemma MListSeg_concat : forall p1 p3 L1 L2,
    p1 ~> MListSeg p3 (L1++L2) =
    \exists p2, p1 ~> MListSeg p2 L1 \* p2 ~> MListSeg p3 L2.
  Proof using.
    intros. gen p1. induction L1 as [| x L1']; intros; rew_list.
    - xpull.
      + applys himpl_hexists_r p1. xchange~ <- MListSeg_nil.
      + xpull ;=> p2. xchange~ MListSeg_nil ;=> ->.
    - rewrite MListSeg_cons. xpull.
      + intros p1'. xchanges~ IHL1'. xchange <- MListSeg_cons.
      + intros p1'. xchange MListSeg_cons. xchanges <- IHL1'.
  Qed.

End MListSegLemmas.


Ltac auto_tilde ::= auto_tilde_default.
