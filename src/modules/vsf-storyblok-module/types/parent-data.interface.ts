export interface ParentData {
  name: string,
  id: number,
  slug: string,
  parent: ParentData | undefined
}
