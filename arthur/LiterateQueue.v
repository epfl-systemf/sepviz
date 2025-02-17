(*|
.. coq:: none
|*)

(**

This file provides examples of the verification of a mutable queue,
using CFML 2.0.

Author: Arthur Charguéraud.
License: CC-by 4.0.

*)

From Sep Require Import Example ExampleListNull ExampleQueue.

Declare Custom Entry heap.
Notation "{*  e  *}" := (e) (e custom heap at level 200, at level 0).

Notation "H1 * H2" :=
  (SepSimplArgs.hstar H1 H2)
    (in custom heap at level 41,
        H2 custom heap at level 41).
Notation "x ~> S" :=
  (repr S x)
    (in custom heap at level 33,
        x custom heap,
        S custom heap at level 32).

Notation "'llet' x := a 'in' v" := ((fun x => v) a) (at level 200).
Locate "\exists".
Notation "∃  x ,  P" :=
  (SepSimplArgs.hexists (fun x => P))
    (in custom heap at level 200, P custom heap at level 200).
Notation "( x )" := (x) (in custom heap at level 0, x custom heap at level 200).
Notation "x" := (x) (in custom heap at level 0, x constr at level 200).

(*||*)

Implicit Types p q : loc.

Goal Some MListSeg_cons = None.
  pose proof MListSeg_cons.
  revert H.
Admitted.

Lemma Triple_transfer : forall A `{EA:Enc A} (L1 L2:list A) p1 p2,
  TRIPLE (transfer p1 p2)
    PRE (p1 ~> MQueue L1 \* p2 ~> MQueue L2)
    POST (fun (_:unit) => p1 ~> MQueue (L1 ++ L2) \* p2 ~> MQueue (@nil A)).
Proof using.

  xwp. xapp. xapp. xif ;=> C.
  { xunfold MQueue. xpull ;=> f2 b2 d2 f1 b1 d1. (* TODO: fix order, should be preserved *)
    destruct L2 as [|x L2']; tryfalse.
    xchange MListSeg_cons ;=> c2.
    xapp. xapp. xapp. xapp. xapp. xapp. xapp. xapp. xapp. xapp. xapp. xapp.
    xchange <- (MListSeg_cons b1). xchange <- (MListSeg_concat f1).
    xchanges (MListSeg_nil_intro f2). }
  { subst. rew_list. xvals~. }
Qed.

(*|
.. raw:: html

   <script src="https://cdnjs.cloudflare.com/ajax/libs/immutable/3.8.2/immutable.min.js" integrity="sha512-myCdDiGJRYrvRb/VuJ67ljifYTJdc1jdEvL4c4ftX9o3N6EAnmD83c/7l2/91RCINZ7c8w21tiXDT7RDFjdc3g==" crossorigin="anonymous"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.1.2/viz.js" integrity="sha512-vnRdmX8ZxbU+IhA2gLhZqXkX1neJISG10xy0iP0WauuClu3AIMknxyDjYHEpEhi8fTZPyOCWgqUCnEafDB/jVQ==" crossorigin="anonymous"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.1.2/full.render.js" integrity="sha512-1zKK2bG3QY2JaUPpfHZDUMe3dwBwFdCDwXQ01GrKSd+/l0hqPbF+aak66zYPUZtn+o2JYi1mjXAqy5mW04v3iA==" crossorigin="anonymous"></script>

   <link rel="stylesheet" href="sep.css">
   <script type="text/javascript" src="parser.js"></script>
   <script type="text/javascript" src="sep.js"></script>

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
