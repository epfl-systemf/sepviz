export type Goal = Segment[];

export type Segment = HState | string;

export type HState = {
  hprop: HProp;
  ctx?: HStateCtx;
  binder?: string;
};

export type HStateCtx = 'PRE' | 'POST';

export type HPropArg = HProp | string;

export type HProp = {
  op: string;
  args: HPropArg[];
};
