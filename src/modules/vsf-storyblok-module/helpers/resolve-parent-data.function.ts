import { ParentData } from '../types/parent-data.interface';

function getStoryParent (story: any) {
  return (
    story.content &&
    story.content.parent &&
    story.content.parent.full_slug
      ? story.content.parent
      : undefined
  );
}

export function resolveParentData (storyParent: any): ParentData | undefined {
  if (!storyParent.full_slug) {
    return;
  }

  const resolvedParents = new Set();
  const parents: any[] = [];

  let parent = storyParent;

  while (parent) {
    parents.push(parent);

    const nextParent = getStoryParent(parent);

    if (!nextParent || resolvedParents.has(nextParent.full_slug)) {
      parent = undefined;
      break;
    }

    resolvedParents.add(nextParent.full_slug);

    parent = nextParent;
  }

  let previousParentData;
  let parentData;

  while (parents.length > 0) {
    const parent = parents.pop();

    parentData = {
      slug: parent.full_slug,
      name: parent.name,
      id: parent.id,
      parent: previousParentData
    };

    previousParentData = parentData;
  }

  return parentData;
}
