(*|
.. coq:: none
|*)

#[warnings="-notation-overridden -ambiguous-paths -notation-incompatible-prefix"]
From SepDiagram.lib Require Import Notations.

Implicit Types (p q: loc).

Definition fst : field := 0%nat.
Definition snd : field := 1%nat.

Definition MCell [A] `{EA: Enc A} (x: A) p := hsingle p ``x.

Definition MCell2 [A B] `{EA: Enc A} `{EB: Enc B} (x1: A) (x2: B) p :=
  (p`.fst ~~> ``x1) \* (p`.snd ~~> ``x2).

(*||*)

Lemma test_node_ordering0: forall (a b c d e f g h i: loc),
  (a ~> MCell2 f b \* f ~> MCell c \* c ~> MCell d \* d ~> MCell2 f e
  \* b ~> MCell g \* g ~> MCell2 i h \* h ~> MCell b
  \* i ~> MCell i \* e ~> MCell e) ==> \[].
Proof. intros.
  replace
    (a ~> MCell2 f b \* f ~> MCell c \* c ~> MCell d \* d ~> MCell2 f e
    \* b ~> MCell g \* g ~> MCell2 i h \* h ~> MCell b
    \* i ~> MCell i \* e ~> MCell e)
  with
    (a ~> MCell2 f b \* b ~> MCell g \* g ~> MCell2 i h \* h ~> MCell b
    \* f ~> MCell c \* c ~> MCell d \* d ~> MCell2 f e
    \* i ~> MCell i \* e ~> MCell e) by admit.
  rewrite hstar_comm.
  rewrite hstar_comm_assoc.
  Admitted.

Lemma test_node_ordering1: forall (a b c d e f g h i: loc),
  (a ~> MCell2 f b \* b ~> MCell g \* h ~> MCell b \* f ~> MCell c
  \* c ~> MCell d \* d ~> MCell2 f e \* g ~> MCell2 i h
  \* i ~> MCell i \* e ~> MCell e) ==> \[].
Proof. intros.
  replace
    (a ~> MCell2 f b \* b ~> MCell g \* h ~> MCell b \* f ~> MCell c
    \* c ~> MCell d \* d ~> MCell2 f e \* g ~> MCell2 i h
    \* i ~> MCell i \* e ~> MCell e)
  with
    (a ~> MCell2 f b \* b ~> MCell g \* g ~> MCell2 i h \* h ~> MCell b
    \* f ~> MCell c \* c ~> MCell d \* d ~> MCell2 f e
    \* i ~> MCell i \* e ~> MCell e) by admit.
  rewrite hstar_comm.
  rewrite hstar_comm_assoc.
  Admitted.

Lemma test_circle0: forall A `{EA: Enc A} (p q: loc),
  (p ~> MCell2 q null \* q ~> MCell2 p null) ==> \[].
Proof. Abort.

Lemma test_circle1: forall A `{EA: Enc A} (p q: loc),
  (q ~> MCell2 p null \* p ~> MCell2 q null) ==> \[].
Proof. Abort.

(*|
.. coq:: none
|*)
