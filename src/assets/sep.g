Goal
  = ts:(NotatedTriple / PlainTriple / Implication / DefaultTop / cruft)* {
  let toJoin = [], joineds = [];
  ts.flat().forEach((t) => {
    if (typeof t === "object") {
      if (toJoin.length) {
        joineds.push(toJoin.join(""));
        toJoin = [];
      }
      joineds.push(t);
    } else {
      toJoin.push(t);
    }
  });
  if (toJoin.length) joineds.push(toJoin.join(""));
  return joineds;
}

cruft
  = .

PlainTriple
  = "Triple" w1:_ code:GallinaTerm _ pre:Top w2:_ post:GallinaTermWithTop {
    if (post.parsed) {
      return [
        "Triple" + w1 + code,
        {position: "pre", ...pre},
        w2 + post.before,
        {position: "post", ...post},
        post.after,
      ];
    } else {
      return [
        "Triple" + w1 + code,
        {position: "pre", ...pre},
        w2 + post.raw,
      ];
    }
}

NotatedTriple
  = "PRE" _ pre:Top _ "CODE" w1:_ code:GallinaTerm w2:_ "POST" w3:_ post:GallinaTermWithTop {
    if (post.parsed) {
      return [
        "PRE",
        {position: "pre", ...pre},
        "CODE" + w1 + code + w2 + "POST" + w3 + post.before,
        {position: "post", ...post},
        post.after,
      ];
    } else {
      return [
        "PRE",
        {position: "pre", ...pre},
        "CODE" + w1 + code + w2 + "POST" + w3 + post.raw,
      ];
    }
}

Implication
  = pre:Top _ "==>" _ post:Top {
    return [
      {position: "pre", ...pre},
      "==>",
      {position: "post", ...post},
    ];
}

GallinaTerm
  = $("(" (_ GallinaTerm)+ _ ")")
    / $[^()\p{White_Space}]+

GallinaTermWithTop
  = Top
    / "(" terms:((_ { return {raw: text()}; }) GallinaTermWithTop)+ w:_ ")" {
      let flatTerms = terms.flat();
      let parsedIdx = flatTerms.findIndex((t) => t.parsed !== undefined);
      if (parsedIdx < 0) {
        return {raw: text()};
      } else {
        return {
          before: "(" + flatTerms.slice(0, parsedIdx).map((t) => t.raw).join("")
            + (flatTerms[parsedIdx].before || ""),
          after: (flatTerms[parsedIdx].after || "")
            + flatTerms.slice(parsedIdx + 1).map((t) => t.raw).join("") + w + ")",
          raw: text(),
          parsed: flatTerms[parsedIdx].parsed,
        };
      }
    }
    / [^()\p{White_Space}]+ { return {raw: text()}; }

DefaultTop = t:(NamedTops / Top) { return [{position: "default", ...t}]; }

NamedTops
  = "[*" _ hd:NamedTopsAtom tl:(_ @NamedTopsAtom)* _ "*]" {
      const hdtops = hd.kind === "namedtops" ? hd.tops : [hd];
      const namedtops = [...hdtops, ...tl];
      return { kind: "namedtops", raw: text(), tops: namedtops };
    }

NamedTopsAtom
  = NamedTops / NamedTop

NamedTop // for iris
  = '\"' _ binder:name _ '\"' _ ":" _ top:Top {
    return { kind: "nametop", top, binder}
}

Top
  = "{*" _ f:WandFormula _ "*}" {
    return { raw: text(), parsed: f };
}

WandFormula
  = H1: Stars _ "-∗" _ H2: WandFormula { // wand is right associative
      return { kind: "wand", H1, H2 };
    }
  / Stars
  / AbstractPred

AbstractPred
  = body: "Φ #()" {
    return { kind: "abstract", body };
}

Stars // stars bind tighter than wands
  = hd:Term tl:(_ "∗" _ @Term)* {
  return { kind: "stars", conjuncts: [hd, ...tl] };
}

Term // non-recursive base terms
  = Parenthesized
  / Existential
  / PointsTo
  / PurePredicate
  / GC
  / Modality

Parenthesized = "(" @WandFormula ")"

Existential
  = ("exists" / "∃") _ binder:name _ "," _ body:Stars {
  return { kind: "existential", binder, body };
}

PointsTo
  = from:name _ "~>" _ to:Formula {
  return { kind: "pointsTo", from, to };
}

// TODO: make it non-specific to CFML (add new notations to CFML)
GC
  = "\\GC" {
  return { kind: "gc" };
}

PurePredicate
  = "⌜" _ p:Formula _ "⌝" {
    return { kind: "purePredicate", predicate: p };
}

Modality
  = op:("▷" / "□") _ body:Term {
    return { kind: "modality", op, body }
}

Formula = (@Atom _)*

Atom = $RawAtom / $ParenthesizedAtom

// Use "★" for the separating star to allow "*" in RawAtom.
RawAtom = !("⌝" / "*}" / "∗" / "-∗") $[^()\p{White_Space}]+

ParenthesizedAtom
  = "(" _ (unsafe / ParenthesizedAtom _)* ")"

name = $[A-Za-z0-9_\'Φ]+

unsafe = $[^()]+

_ "whitespace" = $[\p{White_Space}]*
