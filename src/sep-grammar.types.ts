export type Goal = MaybeHProp[];

export type MaybeHProp = HProp | string;

export interface HProp {
  op: string;
  args: HPropArg[];
  ctx?: HPropCtx;
  binder?: string; // hypothesis name (used in iris)
}

export type HPropCtx = 'PRE' | 'POST';

export type HPropArg = HProp | MaybeValue | MaybeValue[];

export type MaybeValue = Value | string;

export interface Value {
  op: string;
  args: MaybeValue[];
}
