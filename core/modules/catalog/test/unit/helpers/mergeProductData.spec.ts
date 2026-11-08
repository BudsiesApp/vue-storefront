import { mergeProductData } from '@vue-storefront/core/modules/catalog/helpers/mergeProductData'

describe('mergeProductData', () => {
  it('matches projected children and bundle links by their scoped identities', () => {
    const old = {
      configurable_children: [{ sku: 'a', gallery: ['a'], stock: { qty: 1 } }, { sku: 'b', gallery: ['b'], stock: { qty: 2 } }, { sku: 'c' }],
      bundle_options: [
        { option_id: 1, product_links: [{ sku: 'a', product: { sku: 'a' } }] },
        { option_id: 2, product_links: [{ sku: 'a', product: { sku: 'a2', disabled_upgrades: ['x', 'y'] } }, { sku: 'b', product: { sku: 'b' } }] }
      ]
    }
    const incoming = {
      configurable_children: [{ sku: 'b', stock: { available: true } }, { sku: 'a' }],
      bundle_options: [{ option_id: 2, product_links: [{ sku: 'b' }, { sku: 'new' }, { sku: 'a', product: { disabled_upgrades: ['z'] } }] }]
    }
    const oldCopy = JSON.parse(JSON.stringify(old))
    const incomingCopy = JSON.parse(JSON.stringify(incoming))
    const result = mergeProductData(old, incoming)
    expect(result.configurable_children).toEqual([{ sku: 'b', gallery: ['b'], stock: { qty: 2, available: true } }, { sku: 'a', gallery: ['a'], stock: { qty: 1 } }])
    expect(result.bundle_options).toEqual([{ option_id: 2, product_links: [{ sku: 'b', product: { sku: 'b' } }, { sku: 'new' }, { sku: 'a', product: { sku: 'a2', disabled_upgrades: ['z'] } }] }])
    expect(old).toEqual(oldCopy)
    expect(incoming).toEqual(incomingCopy)
  })

  it('replaces present arrays and retains omitted arrays, matching customization values by ID', () => {
    const old = { customizations: [{ id: 'time', optionData: { values: [{ id: 'standard', name: 'Standard' }, { id: 'rush', sku: 'rush', description: 'rush detail' }, { id: 'other', sku: 'other' }] } }], category_ids: [1, 2], gallery: [{ image: 'old', label: 'old' }], disabled_upgrades: ['x', 'y'] }
    const result = mergeProductData(old, { customizations: [{ id: 'time', optionData: { values: [{ id: 'rush', sku: 'rush', name: 'Rush' }] } }], category_ids: [], gallery: [{ image: 'new' }], disabled_upgrades: ['x'] })
    expect(result.customizations[0].optionData.values).toEqual([{ id: 'rush', sku: 'rush', name: 'Rush', description: 'rush detail' }])
    expect(result.category_ids).toEqual([])
    expect(result.gallery).toEqual([{ image: 'new' }])
    expect(result.disabled_upgrades).toEqual(['x'])
    expect(mergeProductData(old, {}).category_ids).toEqual([1, 2])
  })

  it('retains detail only on matching reordered customizations and values', () => {
    const old = { customizations: [
      { id: 'first', label: 'first detail', optionData: { values: [{ id: 'a', description: 'A' }, { id: 'b', description: 'B' }, { id: 'c' }] } },
      { id: 'second', label: 'second detail', optionData: { values: [{ id: 'b', description: 'second B' }] } }
    ] }
    const result = mergeProductData(old, { customizations: [
      { id: 'second', optionData: { values: [{ id: 'b' }] } },
      { id: 'first', optionData: { values: [{ id: 'b' }, { id: 'a' }] } }
    ] })
    expect(result.customizations).toEqual([
      { id: 'second', label: 'second detail', optionData: { values: [{ id: 'b', description: 'second B' }] } },
      { id: 'first', label: 'first detail', optionData: { values: [{ id: 'b', description: 'B' }, { id: 'a', description: 'A' }] } }
    ])
  })

  it('applies product collection rules inside associated products and refreshes nulls', () => {
    const existing = { bundle_options: [{ option_id: 1, product_links: [{ sku: 'linked', product: { sku: 'linked', description: 'old', configurable_children: [{ sku: 'a', stock: { qty: 4 } }, { sku: 'b', stock: { qty: 7 } }] } }] }] }
    const incoming = { bundle_options: [{ option_id: 1, product_links: [{ sku: 'linked', product: { sku: 'linked', description: null, configurable_children: [{ sku: 'b' }] } }] }] }
    expect(mergeProductData(existing, incoming).bundle_options[0].product_links[0].product).toEqual({ sku: 'linked', description: null, configurable_children: [{ sku: 'b', stock: { qty: 7 } }] })
  })

  it('reorders and reduces bundle options by option ID', () => {
    const old = { bundle_options: [{ option_id: 1, title: 'first' }, { option_id: 2, title: 'second' }, { option_id: 3, title: 'removed' }] }
    expect(mergeProductData(old, { bundle_options: [{ option_id: 2 }, { option_id: 1 }] }).bundle_options).toEqual([{ option_id: 2, title: 'second' }, { option_id: 1, title: 'first' }])
  })
})
