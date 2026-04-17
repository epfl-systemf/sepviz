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
  = RichHProp / HProp / !(RichHPropLD / HPropLD) @.

CtxIdent = "PRE" / "POST"
Sep = "┆"

RichHPropLD = "⟬*"
RichHPropRD = "*⟭"
RichHProp
  = RichHPropLD _ ctx:(@CtxIdent _ "@" _)? binder:(@Ident _ ":" _)? hprop:HProp _ RichHPropRD {
      const res = hprop;
      if (ctx) res.ctx = ctx;
      if (binder) res.binder = binder;
      return res;
    }

HPropLD = "⟬"
HPropRD = "⟭"
HProp
  = HPropLD _ op:Ident args:(_ Sep _ @(HProp / HPropTerm))* _ HPropRD {
      return { kind: "hprop", op, args };
    }

HPropTerm = segs:HPropTermSegment* {
    const res = mergeSegments(segs)
      .filter((s) => !(typeof s === "string" && s.trim().length == 0));
    if (res.length == 1) return (typeof res[0] === "string") ? res[0].trim() : res[0];
    return res;
  }

HPropTermSegment
  = Value
   / !(Sep / HPropLD / HPropRD / ValueLD) @.

ValueLD = "⟦"
ValueRD = "⟧"
Value
  = ValueLD _ op:Ident args:(_ Sep _ @(Value / ValueTerm))* _ ValueRD {
      return { kind: "value", op, args};
    }

ValueTerm = cs: ValueTermChar* { return cs.join("").trim(); }
ValueTermChar = !(Sep / ValueLD / ValueRD) @.

Ident = $([a-zA-Z_\u0080-\uFFFF$] [a-zA-Z0-9_'\u0080-\uFFFF]*)

_ "whitespace" = $[\p{White_Space}]*
