(*|
.. coq:: none
|*)

From iris.heap_lang Require Import lang proofmode notation.

From Sepviz Require Import IrisNotations.

Section queues.
Context `{!heapGS Σ}.

Fixpoint isListSeg (p: loc) (L : list val) (q: loc): iProp Σ :=
  match L with
  | [] => ⌜p = q⌝
  | x :: L1 => ∃ (p1: loc), p ↦ (x, #p1) ∗ isListSeg p1 L1 q
  end.

Notation "'PointsTo' ┆ p ┆ ⟦ 'isListSeg' ┆ x ┆ y ⟧" :=
  (isListSeg p x y)
    (in custom sep at level 200,
      p constr, x constr, y constr at level 200,
      only printing): sepviz_scope.

Lemma isListSeg_cons_inv (p : loc) (x : val) (L : list val) (q : loc) :
  isListSeg p (x::L) q ⊢ ∃ (p1: loc), p ↦ (x, #p1) ∗ isListSeg p1 L q.
Proof. intros. simpl. done. Qed.

Lemma isListSeg_cons_app: forall (p p1: loc) (x: val) (L: list val) (q: loc),
  p ↦ (x, #p1) ∗ isListSeg p1 L q ⊢ isListSeg p (x::L) q.
Proof. iIntros. simpl. iFrame. Qed.

Lemma isListSeg_concat : forall p1 p2 p3 L1 L2,
  isListSeg p1 L1 p2 ∗ isListSeg p2 L2 p3 ⊢ isListSeg p1 (L1 ++ L2) p3.
Proof.
  intros p1 p2 p3 L1. revert p1.
  induction L1 as [| x L1' IH]; intros p1 L2.
  - simpl. iIntros "(-> & H)". done.
  - simpl.
    iIntros "((%p1' & Hp1 & H1) & H2)". iFrame.
     iApply IH. by iFrame.
Qed.

Definition isQueue (p : loc) (L : list val): iProp Σ :=
  ∃ (f b: loc) (d: val), p ↦ (#f, #b) ∗ isListSeg f L b ∗ b ↦ (d, NONEV).

Notation "'PointsTo' ┆ p ┆ ⟦ 'isQueue' ┆ x ⟧" :=
  (isQueue p x)
    (in custom sep at level 200,
        p constr, x constr at level 200,
        only printing): sepviz_scope.

Lemma isQueue_fold (p f b : loc) (L : list val) (d : val) :
  p ↦ (#f, #b) ∗ isListSeg f L b ∗ b ↦ (d, NONEV) ⊢ isQueue p L.
Proof. iIntros "(Hp & HL & Hb)". iExists f, b, d. iFrame. Qed.

Lemma isQueue_fold_empty (p f : loc) (d : val) :
  p ↦ (#f, #f) ∗ f ↦ (d, NONEV) ⊢ isQueue p [].
Proof. iIntros "(Hp & Hf)". iApply isQueue_fold. by iFrame. Qed.

Definition is_empty : val :=
  λ: "p",
    let: "q" := !"p" in
    let: "f" := Fst "q" in
    let: "b" := Snd "q" in
    "f" = "b".

Definition transfer : val :=
  λ: "p1" "p2",
    if: ~(is_empty "p2") then
      (* b1 := p1.tail *)
      let: "b1" := Snd !"p1" in
      (* f2 := p2.head *)
      let: "f2" := Fst !"p2" in
      (* d := b1.head *)
      let: "d" := Fst !"b1" in
      (* b1.head := f2.head; b1.tail := f2.tail *)
      "b1" <- (Fst !"f2", Snd !"f2");;
      (* p1.tail := p2.tail *)
      "p1" <- (Fst !"p1", Snd !"p2");;
      (* f2.head := d *)
      "f2" <- ("d", NONEV);;
      (* p2.tail := f2 *)
      "p2" <- (Fst !"p2", "f2")
    else
      #().

Lemma is_empty_spec (p: loc) (L: list val) :
  {{{ isQueue p L }}}
    is_empty #p
  {{{ RET #(bool_decide (L = [])); isQueue p L }}}.
Proof.
  iIntros "%Φ HQ HΦ".
  rewrite /is_empty.
  wp_pures.
  iDestruct "HQ" as (f b d) "(Hp & Hseg & Hb)".
  wp_load. wp_pures. iModIntro.
  destruct L as [| x L1].
  - (* L = [] *)
    simpl. iDestruct "Hseg" as %->. rewrite bool_decide_true; auto.
    iApply "HΦ". unfold isQueue. iExists b, b, d. simpl. iFrame. done.
  - (* L = x :: L1 *)
    iDestruct (isListSeg_cons_inv with "Hseg") as (p1) "[Hf HL]".
    iDestruct (pointsto_ne with "Hf Hb") as %Hne.
    rewrite bool_decide_false; last easy.
    rewrite bool_decide_false; last congruence.
    iApply "HΦ". unfold isQueue. iExists f, b, d. iFrame.
Qed.

(*||*)

Lemma transfer_spec (L1 L2 : list val) (p1 p2 : loc) :
  {{{ isQueue p1 L1 ∗ isQueue p2 L2 }}}
    transfer #p1 #p2
  {{{ RET #();
      isQueue p1 (L1 ++ L2) ∗ isQueue p2 [] }}}.
Proof.
  iIntros "%Φ [HQ1 HQ2] HΦ".
  rewrite /transfer.
  wp_pures.
  wp_apply (is_empty_spec with "HQ2"). iIntros "HQ2".
  destruct L2 as [ | x L2'].
  - wp_pures. iApply "HΦ". rewrite app_nil_r. iModIntro. iFrame.
  - wp_pures.
    iDestruct "HQ1" as (f1 b1 d1) "(Hp1 & HL1 & Hb1)".
    wp_load. wp_pures.
    iDestruct "HQ2" as (f2 b2 d2) "(Hp2 & HL2 & Hb2)".
    wp_load. wp_load. wp_pures.
    iDestruct (isListSeg_cons_inv with "HL2") as (c2) "[Hf2 HL2']".
    wp_load; wp_load; wp_store.
    wp_load; wp_load; wp_store.
    wp_store. wp_load; wp_store.
    iApply "HΦ"; iModIntro.
    iPoseProof (isQueue_fold_empty with "[$Hp2 $Hf2]") as "HQ2". iFrame "HQ2".
    iPoseProof (isListSeg_cons_app with "[$Hb1 $HL2']") as "HL2".
    iPoseProof (isListSeg_concat with "[$HL1 $HL2]") as "HL".
    iPoseProof (isQueue_fold with "[$Hp1 $HL $Hb2]") as "HQ1". by iFrame.
Qed.

(*|
.. coq:: none
|*)

End queues.

(*|
.. raw:: html

   <link rel="stylesheet" href="../sepviz-alectryon.css" />
   <script type="module" src="../sepviz-alectryon.js"></script>
   <script type="text/javascript" src="../control.js"></script>
|*)
