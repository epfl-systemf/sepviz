(*|
.. coq:: none
|*)

#[warnings="-notation-overridden -ambiguous-paths -notation-incompatible-prefix"]
From SepDiagram.lib Require Import Notations.

Ltac auto_star ::=
  try easy;
  try solve [ intuition eauto with maths ].
Ltac auto_tilde ::=
  intros; subst; try auto_star.

Inductive tree {A} :=
| leaf
| node (x: A) (tl tr: tree).
Arguments tree: clear implicits.

Definition data : field := 0%nat.
Definition ltree : field := 1%nat.
Definition rtree : field := 2%nat.

Implicit Types (p pl pr q: loc).

Section TreeDef.

  Context [A: Type] `{EA: Enc A}.
  Implicit Types (x: A) (t: tree A).

  Definition MNode x pl pr p: hprop :=
    (p`.data ~~> ``x) \* (p`.ltree ~~> ``pl) \* (p`.rtree ~~> ``pr).

  Lemma MNode_not_null: forall x pl pr p,
    MNode x pl pr p ==> MNode x pl pr p \* \[p <> null].
  Proof. intros. unfold MNode. xchanges* Hfield_not_null. Qed.

  Fixpoint MTree t p :=
    match t with
    | leaf => \[p = null]
    | node x tl tr =>
        \exists pl pr, p ~> MNode x pl pr \* pl ~> MTree tl \* pr ~> MTree tr
    end.
  Arguments MTree: simpl never.

  Lemma MTree_leaf: forall p, p ~> MTree leaf = \[p = null].
  Proof. reflexivity. Qed.

  Lemma MTree_node: forall p x tl tr,
    p ~> MTree (node x tl tr) =
      \exists pl pr, p ~> MNode x pl pr \* pl ~> MTree tl \* pr ~> MTree tr.
  Proof. reflexivity. Qed.

  Lemma MTree_node_not_null: forall p x tl tr,
    p ~> MTree (node x tl tr) ==> p ~> MTree (node x tl tr) \* \[p <> null].
  Proof. intros. rewrite MTree_node; xpull; intros pl pr.
    Transparent repr. unfold repr. xchanges* MNode_not_null. Opaque repr. Qed.

  Definition leftRotate t: tree A :=
    match t with
    | leaf => leaf
    | node x tl tr =>
        match tr with
        | leaf => t (* default value *)
        | node xr trl trr => node xr (node x tl trl) trr
        end
    end.

  Definition rightRotate t: tree A :=
    match t with
    | leaf => leaf
    | node x tl tr =>
        match tl with
        | leaf => t (* default value *)
        | node xl tll tlr => node xl tll (node x tlr tr)
        end
    end.

End TreeDef.

Section TreeApiImpl.


  Import NotationForVariables.
  Import NotationForTerms.

  Notation "''pl'" := ("pl":var) : var_scope.
  Notation "''pr'" := ("pr":var) : var_scope.
  Notation "''pll'" := ("pll":var) : var_scope.
  Notation "''plr'" := ("plr":var) : var_scope.
  Notation "''prl'" := ("prl":var) : var_scope.
  Notation "''prr'" := ("prr":var) : var_scope.

  Definition is_empty :=
    Fun 'p := ('p '= null).

  Definition left_rotate :=
    Fun 'p :=
      If_ 'not (is_empty 'p) Then (
        Let 'pl := 'p'.ltree in
        Let 'pr := 'p'.rtree in
        If_ 'not (is_empty 'pr) Then (
          Let 'prl := 'pr'.ltree in
          Let 'prr := 'pr'.rtree in
          Set 'p'.rtree ':= 'prl ';
          Set 'pr'.ltree ':= 'p ';
          'pr
        ) Else 'p
      ) Else 'p.

  Definition right_rotate :=
    Fun 'p :=
      If_ 'not (is_empty 'p) Then (
        Let 'pl := 'p'.ltree in
        Let 'pr := 'p'.rtree in
        If_ 'not (is_empty 'pl) Then (
          Let 'pll := 'pl'.ltree in
          Let 'plr := 'pl'.rtree in
          Set 'pl'.rtree ':= 'p ';
          Set 'p'.ltree ':= 'plr ';
          'pl
        ) Else 'p
      ) Else 'p.

  Definition left_right_rotate :=
    Fun 'p :=
      Let 'q := (left_rotate 'p) in
      right_rotate 'q.

End TreeApiImpl.

Module NodeSpecs.
Section GetSet.
  Context [A: Type] `{EA: Enc A}.
  Implicit Types (x: A) (t: tree A).
  Local Transparent repr.

  Lemma Triple_get_field_data: forall p x pl pr,
    SPEC ((val_get_field data) p)
    PRE (p ~> MNode x pl pr)
    POST (fun (r: A) => \[r = x] \* p ~> MNode x pl pr).
  Proof. intros. unfold repr, MNode. xapplys* Triple_get_field. Qed.

  Lemma Triple_get_field_ltree: forall p x pl pr,
    SPEC ((val_get_field ltree) p)
    PRE (p ~> MNode x pl pr)
    POST (fun r => \[r = pl] \* p ~> MNode x pl pr).
  Proof. intros. unfold repr, MNode. xapplys* Triple_get_field. Qed.

  Lemma Triple_get_field_rtree: forall p x pl pr,
    SPEC ((val_get_field rtree) p)
    PRE (p ~> MNode x pl pr)
    POST (fun r => \[r = pr] \* p ~> MNode x pl pr).
  Proof. intros. unfold repr, MNode. xapplys* Triple_get_field. Qed.

  Lemma Triple_set_field_ltree: forall p pl' x pl pr,
    SPEC ((val_set_field ltree) p pl')
    PRE (p ~> MNode x pl pr)
    POST (fun (r: unit) => p ~> MNode x pl' pr).
  Proof. intros. unfold repr, MNode. xapplys* Triple_set_field. Qed.

  Lemma Triple_set_field_rtree: forall p pr' x pl pr,
    SPEC ((val_set_field rtree) p pr')
    PRE (p ~> MNode x pl pr)
    POST (fun (r: unit) => p ~> MNode x pl pr').
  Proof. intros. unfold repr, MNode. xapplys* Triple_set_field. Qed.

End GetSet.
End NodeSpecs.

(*||*)

Section TreeApiSpecs.

  Context [A: Type] `{EA: Enc A}.
  Implicit Types (x: A) (t: tree A).

  Lemma Triple_is_empty : forall t p,
    SPEC (is_empty p)
    PRE (p ~> MTree t)
    POST (fun r => \[r = isTrue (t = leaf)] \* p ~> MTree t).
  Proof.
    xwp. mxapp Triple_eq. destruct t; rewrite isTrue_eq_isTrue_eq.
    - rewrite MTree_leaf. xsimpl*.
    - xchange MTree_node_not_null. xsimpl*.
  Qed.

  Lemma Triple_left_rotate: forall t p,
    SPEC (left_rotate p)
    PRE (p ~> MTree t)
    POST (fun (r: loc) => r ~> MTree (leftRotate t)).
  Proof.
    xwp. mxapp Triple_is_empty. mxapp Triple_neg.
    destruct t as [| x tl tr];
      xif; try easy; intros _.
    - (* t = leaf *) mxvals*.
    - (* t = node *) xchange MTree_node; intros pl pr.
      mxapp NodeSpecs.Triple_get_field_ltree.
      mxapp NodeSpecs.Triple_get_field_rtree.
      mxapp Triple_is_empty. mxapp Triple_neg.
      destruct tr as [| xr trl trr];
        xif; try easy; intros _.
      + (* tr = leaf *) xchange <- MTree_node. mxvals*.
      + (* tr = node *) xchange MTree_node; intros prl prr.
        mxapp NodeSpecs.Triple_get_field_ltree.
        mxapp NodeSpecs.Triple_get_field_rtree.
        mxapp NodeSpecs.Triple_set_field_rtree.
        mxapp NodeSpecs.Triple_set_field_ltree.
        xchange <- MTree_node. xchange <- MTree_node.
        mxvals.
  Qed.

  Lemma Triple_right_rotate: forall t p,
    SPEC (right_rotate p)
    PRE (p ~> MTree t)
    POST (fun (r: loc) => r ~> MTree (rightRotate t)).
  Proof.
    xwp. mxapp Triple_is_empty. mxapp Triple_neg.
    destruct t as [| x tl tr];
      xif; try easy; intros _.
    - (* t = leaf *) mxvals*.
    - (* t = node *) xchange MTree_node; intros pl pr.
      mxapp NodeSpecs.Triple_get_field_ltree.
      mxapp NodeSpecs.Triple_get_field_rtree.
      mxapp Triple_is_empty. mxapp Triple_neg.
      destruct tl as [| xl tll tlr];
        xif; try easy; intros _.
      + (* tr = leaf *) xchange <- MTree_node. mxvals*.
      + (* tr = node *) xchange MTree_node; intros pll plr.
        mxapp NodeSpecs.Triple_get_field_ltree.
        mxapp NodeSpecs.Triple_get_field_rtree.
        mxapp NodeSpecs.Triple_set_field_rtree.
        mxapp NodeSpecs.Triple_set_field_ltree.
        xchange <- (@MTree_node A EA p). xchange <- MTree_node.
        mxvals.
  Qed.

  Lemma Triple_left_right_rotate: forall t x tl xr trl trr p,
    t = node x tl (node xr trl trr) ->
    SPEC (left_right_rotate p)
    PRE (p ~> MTree t)
    POST (fun (r: loc) => r ~> MTree t).
  Proof.
    xwp. subst.
    mxapp~ Triple_left_rotate. mxapp~ Triple_right_rotate. xsimpl.
  Qed.

End TreeApiSpecs.

Ltac auto_star ::= auto_star_default.
Ltac auto_tilde ::= auto_tilde_default.

(*|
.. raw:: html

   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/Iosevka/11.1.1/iosevka/iosevka.min.css" integrity="sha512-3hU20586NsplKRzjf2jQN5vTRTI2EsXObrHDOBLGdkiRkneg699BlmBXWGHHFHADCF3TOk2BREsVy7qTkmvQqQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
   <script src="https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js" integrity="sha512-CSBhVREyzHAjAFfBlIBakjoRUKp5h7VSweP0InR/pAJyptH7peuhCsqAI/snV+TwZmXZqoUklpXp6R6wMnYf5Q==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/immutable/5.1.3/immutable.min.js" integrity="sha512-SkUZE2OlhnJl7tHD4sNNKe3JLiqTebnFYMIl6wGpHEdUm8edM4FwaN+Sq/XIuNjt9KNy105s83gposkrQzxvSg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js" integrity="sha512-vc58qvvBdrDR4etbxMdlTt4GBQk1qjvyORR2nrsPsFPyrs+/u5c3+1Ct6upOgdZoIl7eq6k3a1UPDSNAQi/32A==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/d3-graphviz/5.6.0/d3-graphviz.min.js" integrity="sha512-Le8HpIpS2Tc7SDHLM6AOgAKq6ZR4uDwLhjPSR20DtXE5dFb9xECHRwgpc1nxxnU0Dv+j6FNMoSddky5gyvI3lQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

   <link rel="stylesheet" href="sep.css">
   <script type="module" src="parser.js"></script>
   <script type="module" src="newsep.js"></script>

.. coq:: none
|*)
