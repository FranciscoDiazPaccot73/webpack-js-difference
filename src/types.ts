export type Analyze = {
   name: string,
   'size (Kb)': number,
   chunk: string,
   minimized: boolean
}

export type Difference = {
  type: 'JAVASCRIPT' | 'CSS' | 'IMAGES' | 'OTHERS',
  'base size (Kb)': number,
  'PR size (Kb)': number,
  'Difference (Kb)': number
}