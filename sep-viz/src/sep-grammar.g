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
  function withMeta(node, raw) {
    node.raw = raw;
    return node;
  }
}}

Goal = segs:Segment* { return mergeSegments(segs); }

Segment
  = RichHProp / HProp / Value / !(RichHPropLD / HPropLD) @.

CtxIdent = "PRE" / "POST"
Sep = "┆"

RichHPropLD = "⟬*"
RichHPropRD = "*⟭"
RichHProp
  = RichHPropLD _ ctx:(@CtxIdent _ "@" _)? binder:("\"" @Ident "\"" _ ":" _)? prefix:(@RichHPropTerm _)? hprop:HProp _ postfix:(@RichHPropTerm _)? RichHPropRD {
      const res = hprop;
      if (ctx) res.ctx = ctx;
      if (binder) res.binder = binder;
      const node = (prefix || postfix)
        ? { kind: "rich-hprop", prefix, hprop: res, postfix }
        : res;
      return withMeta(node, text());
    }

RichHPropTerm = cs: RichHPropTermChar* { return cs.join("").trim(); }
RichHPropTermChar = !(HPropLD / RichHPropRD) @.

HPropLD = "⟬"
HPropRD = "⟭"
HProp
  = HPropLD _ op:Ident _ args:(_ Sep _ @(HProp / HPropTerm))* _ HPropRD {
      const node = { kind: "hprop", op, args };
      return withMeta(node, text());
    }

HPropTerm = segs:HPropTermSegment* {
    const res = mergeSegments(segs)
      .filter((s) => !(typeof s === "string" && s.trim().length == 0));
    if (res.length == 1) return (typeof res[0] === "string") ? res[0].trim() : res[0];
    return res;
  }

HPropTermSegment
  = Value
   / !(Sep / HPropLD / HPropRD / ValueLD / ValueRD) @.

ValueLD = "⟦"
ValueRD = "⟧"
Value
  = ValueLD _ op:Ident args:(_ Sep _ @(Value / GallinaTerm))* _ ValueRD {
      const node = { kind: "value", op, args};
      return withMeta(node, text());
    }
GallinaTerm = segs:GallinaTermSegment* {
    const res = mergeSegments(segs)
      .filter((s) => !(typeof s === "string" && s.trim().length == 0));
    if (res.length == 1) return (typeof res[0] === "string") ? res[0].trim() : res[0];
    return res;
  }
GallinaTermSegment
  = Value
  / !(Sep / ValueLD / ValueRD / HPropLD / HPropRD) @.

Delimiter = Sep / HPropLD / HPropRD / ValueLD / ValueRD

Ident = $( !Delimiter [a-zA-Z_\u0080-\uFFFF$\@]
          (!Delimiter [a-zA-Z0-9_'\u0080-\uFFFF])* )

// Ident = $([a-zA-Z_\u0080-\uFFFF$\@] [a-zA-Z0-9_'\u0080-\uFFFF]*)

_ "whitespace" = $[\p{White_Space}]*
