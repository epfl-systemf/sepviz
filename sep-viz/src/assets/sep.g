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

DefaultTop = t:Top { return [{position: "default", ...t}]; }

Top
  = "{*" _ s:Stars _ "*}" {
    return { raw: text(), parsed: s };
}

Stars
  = hd:Term tl:(_ "*" _ @Term)* {
  return { kind: "stars", conjuncts: [hd, ...tl] };
}

Term
  = Parenthesized
  / Existential
  / PointsTo
  / PurePredicate
  / GC

Parenthesized = "(" @Stars ")"

Existential
  = ("exists" / "∃") _ binder:name _ "," _ body:Stars {
  return { kind: "existential", binder, body };
}

PointsTo
  = from:name _ "~>" _ to:Formula {
  return { kind: "pointsTo", from, to };
}

GC
  = "\\GC" {
  return { kind: "gc" };
}

PurePredicate
  = "[*" _ p:Formula _ "*]" {
    return { kind: "purePredicate", predicate: p };
}

Formula = (@Atom _)*

Atom = name / operator / $ParenthesizedAtom

ParenthesizedAtom
  = "(" _ (unsafe / ParenthesizedAtom _)* ")"

name = $[A-Za-z0-9\']+

operator = $("<>" / "=")

unsafe = $[^()]+

_ "whitespace" = $[\p{White_Space}]*
