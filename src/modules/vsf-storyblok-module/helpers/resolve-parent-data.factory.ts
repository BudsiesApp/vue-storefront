import { ParentData } from '../types/parent-data.interface';

export function resolveParentDataFactory (): (parent: any) => ParentData {
  const resolvedParents: Set<string> = new Set();

  function resolve (parent: any): ParentData {
    const parentData = {
      slug: parent.full_slug,
      name: parent.name,
      id: parent.id,
      parent: parent.content ? parent.content.parent : undefined
    };

    resolvedParents.add(parentData.slug);

    if (!parentData.parent) {
      return parentData;
    }

    if (resolvedParents.has(parentData.parent.full_slug)) {
      parentData.parent = undefined;
      return parentData;
    }

    return {
      slug: parent.full_slug,
      name: parent.name,
      id: parent.id,
      parent: resolve(parentData.parent)
    }
  }

  function resolveParentData (parent: any): ParentData {
    resolvedParents.clear();
    return resolve(parent);
  }

  return resolveParentData;
}
