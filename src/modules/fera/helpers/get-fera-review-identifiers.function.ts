export interface FeraReviewIdentifiers {
  reviewId?: string;
  submissionId?: string;
  customerId?: string;
}

type FeraEventNode = Record<string, unknown>;

function isObject (value: unknown): value is FeraEventNode {
  return value !== null && typeof value === 'object';
}

function getFeraResourceId (
  node: FeraEventNode,
  resourceName: 'review' | 'submission' | 'customer',
  prefix: 'frev_' | 'fsub_' | 'fcus_'
): string | undefined {
  if (node.resourceName !== resourceName || typeof node.id !== 'string') {
    return;
  }

  return node.id.startsWith(prefix) ? node.id : undefined;
}

function getFeraCustomerId (node: FeraEventNode): string | undefined {
  if (typeof node.id === 'string' && node.id.startsWith('fcus_')) {
    return node.id;
  }

  const resourceId = getFeraResourceId(node, 'customer', 'fcus_');

  if (resourceId) {
    return resourceId;
  }

  if (typeof node.customer_id === 'string' && node.customer_id.startsWith('fcus_')) {
    return node.customer_id;
  }

  if (!isObject(node.customer) || typeof node.customer.id !== 'string') {
    return;
  }

  return node.customer.id.startsWith('fcus_') ? node.customer.id : undefined;
}

/**
 * Fera's nested event shape is minified and may change. Resource metadata is
 * more stable than property paths, so use it to locate review identifiers.
 */
export function getFeraReviewIdentifiers (event: unknown): FeraReviewIdentifiers {
  const identifiers: FeraReviewIdentifiers = {};
  const visited = new WeakSet<object>();

  const search = (node: unknown): void => {
    if (
      !isObject(node) ||
      visited.has(node) ||
      (identifiers.reviewId && identifiers.submissionId && identifiers.customerId)
    ) {
      return;
    }

    visited.add(node);

    identifiers.reviewId = identifiers.reviewId || getFeraResourceId(node, 'review', 'frev_');
    identifiers.submissionId = identifiers.submissionId || getFeraResourceId(node, 'submission', 'fsub_');
    identifiers.customerId = identifiers.customerId || getFeraCustomerId(node);

    for (const key of Object.getOwnPropertyNames(node)) {
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
