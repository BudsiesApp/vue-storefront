export interface FeraUploadedMedia {
  name: string;
  data: string;
}

type FeraEventNode = Record<string, unknown>;

function isObject (value: unknown): value is FeraEventNode {
  return value !== null && typeof value === 'object';
}

function isUploadedMedia (value: unknown): value is FeraUploadedMedia {
  if (!isObject(value)) {
    return false;
  }

  return typeof value.name === 'string' && typeof value.data === 'string';
}

/**
 * Fera does not expose uploaded review media on a stable submitter property.
 * Search its event payload so this keeps working when its internal structure changes.
 */
export function getUploadedFeraMedia (event: unknown): FeraUploadedMedia[] {
  const media: FeraUploadedMedia[] = [];
  const visited = new WeakSet<object>();

  const search = (node: unknown): void => {
    if (!isObject(node) || visited.has(node)) {
      return;
    }

    visited.add(node);

    if (isUploadedMedia(node.file)) {
      media.push(node.file);
    }

    for (const key of Object.keys(node)) {
      try {
        search(node[key]);
      } catch {
        // Ignore inaccessible Fera internals and continue searching the payload.
      }
    }
  };

  search(event);

  return media;
}
