import { updateProductProductionTimeCustomizationData } from '../../helpers/update-product-production-time-customization-data';
import { OptionType } from '../../types/option-type';

const product = {
  id: '831', customizations: [{ id: 'production', optionData: {
    type: OptionType.PRODUCTION_TIME,
    values: [{ id: 'rush-id', sku: 'rush', name: 'Original', price: 35 }]
  } }]
} as any;

const addon = (id: string, text: string, isDomestic?: boolean, slotsLeft?: number) =>
  ({ id, text, isDomestic, slotsLeft, price: 35, turnaroundTime: 7, isNew: false, isInTimeForChristmas: true });

function prepare (addons: any[], isDomestic?: boolean) {
  const store = { getters: { 'budsies/getProductRushAddons': () => addons } } as any;
  const options = isDomestic === undefined ? { makeProductionTimeRequired: false } : { makeProductionTimeRequired: false, isDomestic };
  return (updateProductProductionTimeCustomizationData(product, store, options) as any).customizations[0].optionData.values;
}

describe('order-specific production time projection', () => {
  it.each([[true, false], [false, true]])('filters the opposite destination when only %s has Rush', (open, closed) => {
    const addons = [addon('', 'Domestic Standard', true), addon('', 'International Standard', false), addon('rush', 'Rush open', open, 0)];
    expect(prepare(addons, open)).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'rush-id', sku: 'rush', name: 'Rush open', price: 35 })]));
    expect(prepare(addons, closed)).toHaveLength(1);
  });

  it('projects two orders sharing a bundle independently before collapsing matching SKUs', () => {
    const addons = [addon('', 'Domestic Standard', true), addon('', 'International Standard', false), addon('rush', 'Domestic Rush', true), addon('rush', 'International Rush', false)];
    const domestic = prepare(addons, true);
    const international = prepare(addons, false);
    expect(domestic.map((item: any) => item.name)).toEqual(['Domestic Standard', 'Domestic Rush']);
    expect(international.map((item: any) => item.name)).toEqual(['International Standard', 'International Rush']);
    expect(domestic[1]).toMatchObject({ id: 'rush-id', sku: 'rush', price: 35 });
    expect(international[1]).toMatchObject({ id: 'rush-id', sku: 'rush', price: 35 });
  });

  it('keeps untagged ordinary records with either context and preserves the no-context path', () => {
    const ordinary = [addon('', 'Standard'), addon('rush', 'Ordinary Rush')];
    expect(prepare(ordinary, true)).toEqual(prepare(ordinary, false));
    expect(prepare(ordinary, false)).toEqual(prepare(ordinary));
    const mixed = [addon('', 'Standard', true), addon('rush', 'Domestic', true), addon('rush', 'International', false)];
    expect(prepare(mixed)[1].name).toBe('International');
  });
});
