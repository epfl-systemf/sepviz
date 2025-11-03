(*|
.. coq:: none
|*)

(**

This file provides examples of the verification of a mutable queue,
using CFML 2.0.

Author: Arthur Charguéraud.
License: CC-by 4.0.

Modified by Yawen.
*)

#[warnings="-notation-overridden -ambiguous-paths -notation-incompatible-prefix"]
From SepDiagram.lib Require Import Notations ListNull.

Ltac auto_star ::=
  try easy;
  try solve [ intuition eauto with maths ].
Ltac auto_tilde ::=
  intros; subst; try auto_star.

Implicit Types (p q f b: loc).

Definition MQueue [A] `{EA: Enc A} (L: list A) p :=
  \exists f b (d:A),
    p ~> MCell f b \* f ~> MListSeg b L \* b ~> MCell d null.

Section QueueApiImpl.

  Import NotationForVariables.
  Import NotationForTerms.

  Definition is_empty :=
    Fun 'p := 'p'.head '= 'p'.tail.

  Definition transfer :=
  Fun 'p1 'p2 :=
    If_ 'not (is_empty 'p2) Then
        Let 'b1 := 'p1'.tail in
        Let 'f2 := 'p2'.head in
        Let 'd := 'b1'.head in
        Set 'b1'.head ':= ('f2'.head) ';
        Set 'b1'.tail ':= ('f2'.tail) ';
        Set 'p1'.tail ':= ('p2'.tail) ';
        Set 'f2'.head ':= 'd ';
        Set 'f2'.tail ':= ``null ';
        Set 'p2'.tail ':= 'f2
    Else ``tt.

End QueueApiImpl.

(*||*)

Goal forall A `{EA: Enc A} (L: list A) p f b,
  Triple (is_empty p)
    (f ~> MListSeg b L)
    (fun (r: unit) => \[]).
Proof. Abort.

Lemma Triple_test_drawing_pure_conditions: forall A `{EA: Enc A} (L: list A) p,
  Triple (is_empty p)
    (p ~> MQueue L \* \[L <> nil])
    (fun r => \[r = false] \* p ~> MQueue L \* \[L <> nil]).
Proof using.
  xwp. xunfolds MQueue ;=> f b d H.
  mxapp Triple_get_head. mxapp Triple_get_tail. mxapp Triple_eq.
  xchanges MListSeg_MCell_conflict ;=> M; auto.
  apply isTrue_eq_false. intros Heq; apply M in Heq; auto.
Qed.

Lemma Triple_is_empty : forall A `{EA: Enc A} (L: list A) p,
  Triple (is_empty p)
    (p ~> MQueue L)
    (fun r => \[r = isTrue (L = nil)] \* p ~> MQueue L).
Proof using.
  xwp. xunfolds MQueue ;=> f b d.
  mxapp Triple_get_head. mxapp Triple_get_tail. mxapp Triple_eq.
  xchanges MListSeg_MCell_conflict ;=> M.
  rewrite* isTrue_eq_isTrue_eq.
Qed.

Lemma Triple_transfer : forall {A} `{EA: Enc A} (L1 L2: list A) p1 p2,
  Triple (transfer p1 p2)
    (p1 ~> MQueue L1 \* p2 ~> MQueue L2)
    (fun (r:unit) => p1 ~> MQueue (L1 ++ L2) \* p2 ~> MQueue (@nil A)).
Proof using.
  xwp. mxapp Triple_is_empty. mxapp Triple_neg. xif ;=> C.
  - xunfold MQueue. xpull ;=> f2 b2 d2 f1 b1 d1.
    destruct L2 as [| x L2']; [solve [tryfalse] |].
    xchange MListSeg_cons ;=> c2.
    mxapp Triple_get_tail. mxapp Triple_get_head.
    mxapp Triple_get_head. mxapp Triple_get_head.
    mxapp Triple_set_head. mxapp Triple_get_tail.
    mxapp Triple_set_tail. mxapp Triple_get_tail.
    mxapp Triple_set_tail. mxapp Triple_set_head.
    mxapp Triple_set_tail. mxapp Triple_set_tail.
    xchange <- (@MListSeg_cons A EA b1). xchange <- (@MListSeg_concat A EA f1).
    xchanges (@MListSeg_nil_intro A EA f2).
  - subst. rew_list. mxvals.
Qed.

Lemma Triple_transfer_test_brackets : forall {A} `{EA: Enc A} (L1 L2: list A) p1 p2,
  Triple (transfer p1 p2)
    (p1 ~> MQueue L1 \* p2 ~> MQueue L2)
    (fun (r:unit) => p1 ~> MQueue (L1 ++ L2) \* p2 ~> MQueue (@nil A)).
Proof using.
  xwp. mxapp Triple_is_empty. mxapp Triple_neg. xif ;=> C.
  { xunfold MQueue. xpull ;=> f2 b2 d2 f1 b1 d1.
    destruct L2 as [| x L2']; [solve [tryfalse] |].
    xchange MListSeg_cons ;=> c2.
    mxapp Triple_get_tail. mxapp Triple_get_head.
    mxapp Triple_get_head. mxapp Triple_get_head.
    mxapp Triple_set_head. mxapp Triple_get_tail.
    mxapp Triple_set_tail. mxapp Triple_get_tail.
    mxapp Triple_set_tail. mxapp Triple_set_head.
    mxapp Triple_set_tail. mxapp Triple_set_tail.
    xchange <- (@MListSeg_cons A EA b1). xchange <- (@MListSeg_concat A EA f1).
    xchanges (@MListSeg_nil_intro A EA f2). }
  subst. rew_list. mxvals.
Qed.

Ltac auto_star ::= auto_star_default.
Ltac auto_tilde ::= auto_tilde_default.

(*|
.. coq:: none
|*)

(* ********************************************************************** *)
(* ** Bonus *)

(** Alternative specification for [pop_front] for the case the list *)
(*     is already of the form [x::L']. *)

(* The following causes an assertion error in Coq *)
(* Lemma triple_pop_front' : forall A `{EA:Enc A} p x (L':list A), *)
(*   TRIPLE (pop_front p) *)
(*     PRE (p ~> MQueue (x::L')) *)
(*     POST (fun r => \[r = x] \* p ~> MQueue L'). *)
(* Proof using. *)
(*   intros. xapply (>> Triple_pop_front (x::L')). *)
(*   { auto_false. } *)
(*   { xsimpl. } *)
(*   { xpull ;=> r L'2 E. inverts E. xsimpl~. } *)
(* Qed. *)

(* TODO: disable RET notation in TRIPLE *)
