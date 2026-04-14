/**
   Grammar of the canonical separation-logic language

   Peggy will generate a parser based on this grammar (handled by
   `vite-plugin-peggy.ts`). One can also run this command for manual generation:
    `peggy --format es --dts -o sep-parser.js sep-grammar.g`.
*/


{{
  function mergeSegments(segs) {
    // Merge adjacent opaque chars.
    let toJoin = [], joineds = [];
    segs.forEach((s) => {
    if (typeof s === "object") {
        if (toJoin.length) {
            joineds.push(toJoin.join(""));
            toJoin = [];
        }
        joineds.push(s);
    } else {
        toJoin.push(s);
    }
    });
    if (toJoin.length) joineds.push(toJoin.join(""));
    return joineds;
  }
}}

Goal = segs:Segment* { return mergeSegments(segs); }

Segment
  = Region
  / !RegionLD @.

RegionLD = "⟬"
RegionRD = "⟭"
RegionCtx = "PRE" / "POST"

Region
  = RegionLD _  ctx:(@RegionCtx _ "@" _)? binder:(@Ident _ ":" _)? formula:Formula _ RegionRD {
      let res = { formula };
      if (ctx) res.ctx = ctx;
      if (binder) res.binder = binder;
      return res;
    }

FormulaLD = "⟬"
FormulaRD = "⟭"
FormulaSep = "┆"

Formula
  = FormulaLD _ op:FormulaTerm args:(_ FormulaSep _ @Formula)* _ FormulaRD {
      return { op, args };
    }
  / FormulaTerm


FormulaTerm = cs:FormulaChar* { return cs.join("").trim(); }
FormulaChar = !(FormulaSep / FormulaRD) @.

Ident = $([a-zA-Z_\u0080-\uFFFF] [a-zA-Z0-9_'\u0080-\uFFFF]*)

IdentCont
  = [a-zA-Z0-9_'\u0080-\uFFFF]

_ "whitespace" = $[\p{White_Space}]*
