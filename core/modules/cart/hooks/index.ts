import { createListenerHook, createMutatorHook } from '@vue-storefront/core/lib/hooks'
import type { DiffLog } from '../helpers/createDiffLog';
import CartItem from '../types/CartItem';

export interface AfterAddToCartPayload {
  cartItem: CartItem,
  diffLog?: DiffLog,
  source?: 'server-import'
}

const {
  hook: beforeSyncHook,
  executor: beforeSyncExecutor
} = createMutatorHook<{ clientItems: CartItem[], serverItems: CartItem[] }, any>()

const {
  hook: afterSyncHook,
  executor: afterSyncExecutor
} = createListenerHook<any>()

const {
  hook: beforeAddToCartHook,
  executor: beforeAddToCartExecutor
} = createMutatorHook<{ cartItem: CartItem }, any>()

const {
  hook: afterAddToCartHook,
  executor: afterAddToCartExecutor
} = createListenerHook<AfterAddToCartPayload>()

const {
  hook: beforeRemoveFromCartHook,
  executor: beforeRemoveFromCartExecutor
} = createMutatorHook<{ cartItem: CartItem }, any>()

const {
  hook: afterRemoveFromCartHook,
  executor: afterRemoveFromCartExecutor
} = createListenerHook<any>()

const {
  hook: beforeMergeHook,
  executor: beforeMergeExecutor
} = createMutatorHook<{ clientItems: CartItem[], serverItems: CartItem[] }, any>()

const {
  hook: afterLoadHook,
  executor: afterLoadExecutor
} = createListenerHook<any>()

const cartHooksExecutors = {
  beforeSync: beforeSyncExecutor,
  afterSync: afterSyncExecutor,
  beforeAddToCart: beforeAddToCartExecutor,
  afterAddToCart: afterAddToCartExecutor,
  beforeRemoveFromCart: beforeRemoveFromCartExecutor,
  afterRemoveFromCart: afterRemoveFromCartExecutor,
  beforeMerge: beforeMergeExecutor,
  afterLoad: afterLoadExecutor
}

const cartHooks = {
  beforeSync: beforeSyncHook,
  afterSync: afterSyncHook,
  beforeAddToCart: beforeAddToCartHook,
  afterAddToCart: afterAddToCartHook,
  beforeRemoveFromCart: beforeRemoveFromCartHook,
  afterRemoveFromCart: afterRemoveFromCartHook,
  beforeMerge: beforeMergeHook,
  afterLoad: afterLoadHook
}

export {
  cartHooks,
  cartHooksExecutors
}
