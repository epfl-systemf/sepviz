/**
   Grammar of the canonical separation-logic language

   Peggy will generate a parser based on this grammar (handled by
   `vite-plugin-peggy.ts`). One can also run this command for manual generation:
    `peggy --format es --dts -o sepParser.js sep-grammar.g`.
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
  = HState
  / !HStateLD @.

HStateLD = "⟬"
HStateRD = "⟭"
HStateCtx = "PRE" / "POST"

HState
  = HStateLD _  ctx:(@HStateCtx _ "@" _)? binder:(@Ident _ ":" _)? hprop:HProp _ HStateRD {
      let res = { hprop };
      if (ctx) res.ctx = ctx;
      if (binder) res.binder = binder;
      return res;
    }

HPropLD = "⟬"
HPropRD = "⟭"
HPropSep = "┆"

HProp
  = HPropLD _ op:HPropTerm args:(_ HPropSep _ @(HProp / HPropTerm))* _ HPropRD {
      return { op, args };
    }


HPropTerm = cs:HPropChar* { return cs.join("").trim(); }
HPropChar = !(HPropSep / HPropRD) @.

Ident = $([a-zA-Z_\u0080-\uFFFF] [a-zA-Z0-9_'\u0080-\uFFFF]*)

IdentCont
  = [a-zA-Z0-9_'\u0080-\uFFFF]

_ "whitespace" = $[\p{White_Space}]*
