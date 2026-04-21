import { parse } from '../src/sep-grammar.g';
import { expect, test } from 'vitest';

function tryParse(desc, input) {
  console.log(`\n=== ${desc} ===`);
  console.log(`Input: "${input}"`);
  try {
    const result = parse(input);
    console.log('Success:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('Failed:', e.message);
    if (e.location) {
      const pos = e.location.start.offset;
      console.log(
        `At position ${pos}: "${input.substring(Math.max(0, pos - 5), pos)}>>>${input.substring(pos, pos + 10)}"`
      );
    }
  }
}

test('parse one simple plain region', () => {
  expect(parse('text ⟬ Opaque ┆ emp ⟭ some more text')).toEqual([
    'text ',
    { kind: 'hprop', args: ['emp'], op: 'Opaque' },
    ' some more text',
  ]);
});

test('parse one simple named region', () => {
  expect(parse('text ⟬* PRE @ Hφ: ⟬ Opaque ┆ emp ⟭ *⟭ some more text')).toEqual(
    [
      'text ',
      {
        kind: 'hprop',
        op: 'Opaque',
        args: ['emp'],
        binder: 'Hφ',
        ctx: 'PRE',
      },
      ' some more text',
    ]
  );
});

test('parse two regions', () => {
  expect(
    parse(
      '⟬* PRE @ Hφ: ⟬ NULL ┆ emp ⟭ *⟭ code do something (fun r => ⟬* POST @ ⟬ PointsTo ┆ r ┆ isList ┆ l1 ++ l2 ⟭ *⟭) '
    )
  ).toEqual([
    {
      kind: 'hprop',
      args: ['emp'],
      op: 'NULL',
      binder: 'Hφ',
      ctx: 'PRE',
    },
    ' code do something (fun r => ',
    {
      kind: 'hprop',
      op: 'PointsTo',
      args: ['r', 'isList', 'l1 ++ l2'],
      ctx: 'POST',
    },
    ') ',
  ]);
});

test('parse value', () => {
  expect(
    parse(
      'text ⟬ PointsTo ┆ p ┆ isValue ┆ z + ⟦ SpecialV ┆ x ┆ y ⟧ ⟭ some more text'
    )
  ).toEqual([
    'text ',
    {
      kind: 'hprop',
      args: [
        'p',
        'isValue',
        ['z + ', { kind: 'value', op: 'SpecialV', args: ['x', 'y'] }],
      ],
      op: 'PointsTo',
    },
    ' some more text',
  ]);
});

test('parse nested hprops', () => {
  expect(
    parse(
      '⟬ STAR ┆ A ┆ ⟬ STAR ┆ B ┆ C ⟭ ┆ ⟬ PointsTo ┆ p: Int ┆ isList ┆ l1 ++ l2 ⟭ ⟭'
    )
  ).toEqual([
    {
      kind: 'hprop',
      op: 'STAR',
      args: [
        'A',
        { kind: 'hprop', op: 'STAR', args: ['B', 'C'] },
        {
          kind: 'hprop',
          op: 'PointsTo',
          args: ['p: Int', 'isList', 'l1 ++ l2'],
        },
      ],
    },
  ]);
});

test('cfml triple', () => {
  expect(
    parse('⟬* POST @ (fun x: A => and some more ⟬ Opaque ┆ GC ⟭ ) *⟭')
  ).toEqual([
    {
      kind: 'rich-hprop',
      prefix: '(fun x: A => and some more',
      hprop: {
        kind: 'hprop',
        args: ['GC'],
        ctx: 'POST',
        op: 'Opaque',
      },
      postfix: ')',
    },
  ]);
});

// test('test', () => {
//   const text = `⟬* PRE @ ⟬ Star ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $MQueue ┆ L2 ⟧ ⟭ ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $MQueue ┆ L1 ⟧ ⟭ ⟭ *⟭
// CODE Wpgen_app_untyped (trm_apps val_neg \`\`[ isTrue (L2 = nil)])
// ⟬* POST @ fun X : bool =>
//           Wptag
//             (Wpgen_if X
//                (Wptag
//                   (Wpgen_let
//                      (Wptag
//                         (Wpgen_app_untyped
//                            (trm_apps (val_get_field tail) ⟦ $list_cons ┆ p1 ┆ nil ⟧)))
//                      (fun (A : Type) (EA : Enc A) (X0 : A) =>
//                       Wptag
//                         (Wpgen_let
//                            (Wptag
//                               (Wpgen_app_untyped
//                                  (trm_apps (val_get_field head) ⟦ $list_cons ┆ p2 ┆ nil ⟧)))
//                            (fun (A0 : Type) (EA0 : Enc A0) (X1 : A0) =>
//                             Wptag
//                               (Wpgen_let
//                                  (Wptag (Wpgen_app_untyped (trm_apps (val_get_field head) \`\`[ X0])))
//                                  (fun (A1 : Type) (EA1 : Enc A1) (X2 : A1) =>
//                                   Wptag
//                                     (Wpgen_seq
//                                        (Wptag
//                                           (Wpgen_let
//                                              (Wptag
//                                                 (Wpgen_app_untyped
//                                                    (trm_apps (val_get_field head) \`\`[ X1])))
//                                              (fun (A2 : Type) (EA2 : Enc A2) (V1 : A2) =>
//                                               Wptag
//                                                 (Wpgen_app_untyped
//                                                    (trm_apps (val_set_field head) \`\`[ X0, V1])))))
//                                        (Wptag
//                                           (Wpgen_seq
//                                              (Wptag
//                                                 (Wpgen_let
//                                                    (Wptag
//                                                       (Wpgen_app_untyped
//                                                          (trm_apps (val_get_field tail) \`\`[ X1])))
//                                                    (fun (A2 : Type) (EA2 : Enc A2) (V1 : A2) =>
//                                                     Wptag
//                                                       (Wpgen_app_untyped
//                                                          (trm_apps (val_set_field tail) \`\`[ X0, V1])))))
//                                              (Wptag
//                                                 (Wpgen_seq
//                                                    (Wptag
//                                                       (Wpgen_let
//                                                          (Wptag
//                                                             (Wpgen_app_untyped
//                                                                (trm_apps
//                                                                   (val_get_field tail)
//                                                                   ⟦ $list_cons ┆ p2 ┆ nil ⟧)))
//                                                          (fun (A2 : Type) (EA2 : Enc A2) (V1 : A2)
//                                                           =>
//                                                           Wptag
//                                                             (Wpgen_app_untyped
//                                                                (trm_apps
//                                                                   (val_set_field tail)
//                                                                   ⟦ $list_cons ┆ p1 ┆ \`\`[ V1] ⟧)))))
//                                                    (Wptag
//                                                       (Wpgen_seq
//                                                          (Wptag
//                                                             (Wpgen_app_untyped
//                                                                (trm_apps
//                                                                   (val_set_field head)
//                                                                   \`\`[ X1, X2])))
//                                                          (Wptag
//                                                             (Wpgen_seq
//                                                                (Wptag
//                                                                   (Wpgen_app_untyped
//                                                                      (trm_apps
//                                                                       (val_set_field tail)
//                                                                       \`\`[ X1, null])))
//                                                                (Wptag
//                                                                   (Wpgen_app_untyped
//                                                                      (trm_apps
//                                                                       (val_set_field tail)
//                                                                       ⟦ $list_cons ┆ p2 ┆ \`\`[ X1] ⟧)))))))))))))))))))
//                (Wptag (Wpgen_val_unlifted \`\`tt))) Enc_unit
//             (fun _ : unit =>
//              ⟬
//              Star ┆ ⟬
//                     Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $MQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭
//                     ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $MQueue ┆ nil ⟧ ⟭ ⟭ ┆ ⟬ Opaque ┆ GC ⟭ ⟭) *⟭
// `;
//   tryParse('test', text);
// });
