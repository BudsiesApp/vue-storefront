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
    const nextParent = getStoryParent(parent);

    parents.push(parent);

    if (!nextParent || resolvedParents.has(nextParent.full_slug)) {
      parent = undefined;
      break;
    }

    resolvedParents.add(nextParent.full_slug);

    parent = nextParent;
  }

  for (let i = parents.length - 1; i >= 0; i--) {
    const parent = parents[i];

    const parentData = {
      slug: parent.full_slug,
      name: parent.name,
      id: parent.id,
      parent: parent.parent
    };

    parents[i] = parentData;

    const hasChild = i > 0;

    if (!hasChild) {
      break;
    }

    const child = parents[i - 1];
    child.parent = parentData;
  }

  return parents[0];
}
