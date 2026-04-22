export type Goal = MaybeHProp[];

export type MaybeHProp = HProp | RichHProp | Value | string;

export interface RichHProp {
  prefix: string;
  hprop: HProp;
  postfix: string;
  _start: number;
  _end: number;
}

export interface HProp {
  op: string;
  args: HPropArg[];
  ctx?: HPropCtx;
  binder?: string; // hypothesis name (used in iris)
  _start: number;
  _end: number;
}

export function isHProp(x: any): x is HProp {
  return typeof x === 'object' && 'kind' in x && x.kind === 'hprop';
}

export type HPropCtx = 'PRE' | 'POST';

export type HPropArg = HProp | MaybeValue | MaybeValue[];

export type MaybeValue = Value | string | (Value | string)[];

export interface Value {
  op: string;
  args: MaybeValue[];
  _start: number;
  _end: number;
  _raw: string;
}

export function isValue(x: any): x is Value {
  return typeof x === 'object' && 'kind' in x && x.kind === 'value';
}
