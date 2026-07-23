(*|
.. coq:: none
|*)

From iris.heap_lang Require Import lang proofmode notation.
From Sepviz Require Import IrisNotations.
From Sepviz.Examples.Demo Require Import Shared.
Open Scope sepviz_scope.

Section queues.
Context `{!heapGS Σ}.

Disable Notation (all): sepviz_scope.

(*|
.. coq:: no-hyps
|*)

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

(*|
.. raw:: html

   <script>
   // for clicker
   document.addEventListener("keydown", function (event) {
     const previous =
       event.key === "PageUp" ||
       event.key === "ArrowLeft";

     const next =
       event.key === "PageDown" ||
       event.key === "ArrowRight";

     if (!previous && !next)
       return;

     event.preventDefault();
     event.stopPropagation();

     if (previous)
       Alectryon.slideshow.previous();
     else
       Alectryon.slideshow.next();
   }, true);
   </script>
|*)
