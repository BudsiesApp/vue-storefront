# Design

## Context

Creation pages fetch the parent product, then fetch its bundle children. The parent's customization values already provide `price`, nullable `specialPrice`, date bounds, `productId`, and `bundleOptionItemId`. Child loading is unnecessary for resolving these prices.

## Goals / Non-Goals

**Goals:** Resolve option and bundle prices from customization metadata and existing campaign adjustments. Preserve product-price dictionaries and rich-text price consumers. Remove the dependent child request from creation pages.

**Non-Goals:** Change upstream data, add endpoints, fabricate child products, mutate parent prices during loading, or change unrelated catalog loading and cart submission behavior.

## Decisions

### Option prices

Use the existing pure `getOptionValuePrice` helper. It always returns a price object. The regular amount comes from `price`, defaulting to zero. A special amount applies within its optional date bounds; an invalid or out-of-window bound prevents its use. A campaign entry matched by `productId` takes precedence for the effective amount and, when supplied, the regular comparison amount. Return a special amount only when it is lower than the regular amount; otherwise return `special: null`. Preserve zero prices and apply the supplied exchange rate once.

Widgets, lowest-price selection, customization totals, and cart configuration descriptions call this resolver. They do not read child-product or ordinary product-price dictionaries. Expose the existing catalog campaign state through a public getter.

### Bundle prices

Keep the default bundle's ordinary catalog price fields and `calculateProductDefaultBundleOptionsPrice` unchanged. The configured `calculateBundlePriceByOptions` flag is disabled, so loading child products does not recalculate those fields.

Keep the existing discount helper names and delegation. `getBundleProductDefaultDiscountedPrice` selects each enabled required customization's explicit default value. If there is no explicit default, select the enabled value with a non-null price and the lowest effective price, including campaign adjustments. Pass each chosen value with quantity one to `getBundleOptionDiscountedPrice`. `getBundleCartItemDiscountedPrice` resolves the full customization state once through the selected-values helper, which carries each state item's quantity, and delegates to the same shared helper.

The shared helper skips values without a regular price, sums resolved prices with selection quantities, and returns totals only when an included priced value's product ID matches a campaign entry. Equal regular and final totals still qualify when a campaign entry matches. Without a match, return `undefined`. The ordinary cart calculator also reads selected customization prices, without campaign overrides, and applies each state item's quantity.

Keep `getProductPrice` unchanged and preserve the existing `getProductDefaultPrice` and `getCartItemPrice` flow: obtain ordinary price data, resolve campaign pricing, and pass both through the existing final price calculation. Item quantity stays in that final calculation, and authoritative server cart totals retain precedence. Do not add bundle-specific early returns to these entry points or read bundle links and child products for prices. Other product types retain their existing handling.

Product-price dictionaries retain entries for actual loaded products. A bundle parent's existing catalog price and applicable customization-derived discount remain under its own ID. Product and cart price calculations use the default exchange rate of one, and their existing localized getters apply display currency conversion. Widgets and cart configuration descriptions pass the active exchange rate to the option resolver instead. Rich-text directives keep using the existing product getters. Unloaded child IDs are not added to the dictionaries.

### Creation-page loading

Pass the existing `prefetchGroupProducts` preference through the single-product Vuex and resolver path, including cache reads and cache fallbacks. Keep the single-product default enabled and the list-loading defaults unchanged. The single-product, multi-product, and wizard creation-page loaders explicitly disable it. Leave associated-product loader implementations unchanged.

### Directive loading

The rich-text directive loader passes `prefetchGroupProducts: false` when fetching referenced parent products missing from the product dictionary. It retains the existing behavior of reusing an already-loaded parent without another request. Price directives continue to use existing product-price getters in SSR and browser rendering.

### Cart loading and quantity selection

Retain the cart synchronization path. A successful cart merge refreshes cart products through `product/findProducts` with its browser prefetch default enabled, then copies refreshed `bundle_options` onto cart items. Server-restored items use `product/single` with prefetch enabled, including cached-parent configuration.

Keep the quantity-selector helper unchanged. For a bundle option titled `product`, it reads the selected or default child's `stock.max_sale_qty`; when that child or limit is unavailable, it returns `10000`. The cart uses a result greater than one to show its quantity selector. Local cart restoration can render before product refresh completes, so the existing fallback can apply during that interval. Opening the cart component does not itself initiate a child-product request.

Bundle selection submission continues using the existing customization value IDs, bundle item IDs, and quantities.
