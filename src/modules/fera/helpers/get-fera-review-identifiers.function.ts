export interface FeraReviewIdentifiers {
  reviewId?: string;
  submissionId?: string;
}

type FeraEventNode = Record<string, unknown>;

function isObject (value: unknown): value is FeraEventNode {
  return value !== null && typeof value === 'object';
}

function getFeraResourceId (
  node: FeraEventNode,
  resourceName: 'review' | 'submission',
  prefix: 'frev_' | 'fsub_'
): string | undefined {
  if (node.resourceName !== resourceName || typeof node.id !== 'string') {
    return;
  }

  return node.id.startsWith(prefix) ? node.id : undefined;
}

/**
 * Fera's nested event shape is minified and may change. Resource metadata is
 * more stable than property paths, so use it to locate review identifiers.
 */
export function getFeraReviewIdentifiers (event: unknown): FeraReviewIdentifiers {
  const identifiers: FeraReviewIdentifiers = {};
  const visited = new WeakSet<object>();

  const search = (node: unknown): void => {
    if (!isObject(node) || visited.has(node) || (identifiers.reviewId && identifiers.submissionId)) {
      return;
    }

    visited.add(node);

    identifiers.reviewId = identifiers.reviewId || getFeraResourceId(node, 'review', 'frev_');
    identifiers.submissionId = identifiers.submissionId || getFeraResourceId(node, 'submission', 'fsub_');

    for (const key of Object.keys(node)) {
      try {
        search(node[key]);
      } catch {
        // Ignore inaccessible Fera internals and continue searching the payload.
      }
    }
  };

  search(event);

  return identifiers;
}
