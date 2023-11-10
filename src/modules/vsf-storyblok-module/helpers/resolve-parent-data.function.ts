import { ParentData } from '../types/parent-data.interface';

export function resolveParentData (parent: any): ParentData {
  const parentData = {
    slug: parent.full_slug,
    name: parent.name,
    id: parent.id,
    parent: parent.content ? parent.content.parent : undefined
  };

  if (!parentData.parent) {
    return parentData;
  }

  return {
    slug: parent.full_slug,
    name: parent.name,
    id: parent.id,
    parent: resolveParentData(parentData.parent)
  }
}
