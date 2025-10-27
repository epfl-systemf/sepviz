module.exports = `
  PRE {*
      f2 ~> MCell x c2 *
      c2 ~> MListSeg b2 L2' *
      p2 ~> MCell f2 b2 *
      b2 ~> MCell d2 null * p1 ~> MCell f1 b1 * f1 ~> MListSeg b1 L1 * b1 ~> MCell d1 null *}
  CODE (Let_ [A0 EA0] X := \`App (val_get_field tail) p1 in
         \`Let_ [A1 EA1] X0 := \`App (val_get_field head) p2 in
           \`Let_ [A2 EA2] X1 := \`App (val_get_field head) (\`\`X) in
             \`Seq \`Let_ [A3 EA3] V1 := \`App (val_get_field head) (\`\`X0) in
                    \`App (val_set_field head) (\`\`X) (\`\`V1)';
               (\`Seq \`Let_ [A3 EA3] V1 := \`App (val_get_field tail) (\`\`X0) in
                       \`App (val_set_field tail) (\`\`X) (\`\`V1)';
                  (\`Seq \`Let_ [A3 EA3] V1 := \`App (val_get_field tail) p2 in
                          \`App (val_set_field tail) p1 (\`\`V1)';
                     (\`Seq \`App (val_set_field head) (\`\`X0) (\`\`X1)';
                        (\`Seq \`App (val_set_field tail) (\`\`X0) (\`\`null)';
                           (\`App (val_set_field tail) p2 (\`\`X0)))))))
  POST (fun _ : unit =>
        {*
        (∃ f, ∃ b, ∃ d, p1 ~> MCell f b * f ~> MListSeg b (L1 ++ x :: L2') * b ~> MCell d null) *
        (∃ f, ∃ b, ∃ d, p2 ~> MCell f b * f ~> MListSeg b nil * b ~> MCell d null) * \\GC *})
`;
