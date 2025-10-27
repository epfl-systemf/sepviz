Goal
  = ts:(Top / cruft)* {
  return [].concat(...ts);
}

cruft
  = .

Top
  = "{*" _ s:Stars _ "*}" {
    return { raw: text(), parsed: s };
}

Stars
  = hd:Term tl:(_ "*" _ Term)* {
  return { kind: "stars", conjuncts: [hd, ...tl.map(t => t[3])] };
}

Term
  = Parenthesized
  / Existential
  / PointsTo
  / GC

Parenthesized
  = "(" s:Stars ")" {
  return s;
}

Existential
  = ("exists" / "∃") _ binder:name _ "," _ body:Stars {
  return { kind: "existential", binder, body };
}

PointsTo
  = from:name _ "~>" _ to:Formula {
  return { kind: "points-to", from, to };
}

GC
  = "\\GC" {
  return { kind: "gc" };
}

Formula
  = hd:Atom tl:(_ Atom)* {
  return [hd, ...tl.map(a => a[1])];
}

Atom
  = name
  / ParenthesizedAtom {
  return text();
}

ParenthesizedAtom
  = "(" _ (unsafe / ParenthesizedAtom _)* ")"

name "name"
  = n:[A-Za-z0-9\']+ {
  return n.join("");
}

unsafe "unsafe"
  = u:[^()]+ {
  return u.join("");
}

_ "whitespace"
  = w:[ \t\n\r]* {
    return w.join('');
}
