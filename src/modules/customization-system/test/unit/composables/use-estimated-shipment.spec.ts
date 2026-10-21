import { defineComponent, nextTick, ref } from 'vue';

import { mountWithApplicationServices } from '../../../../../../test/unit/utils/application-services';
import { useEstimatedShipment } from '../../../composables/use-estimated-shipment';
import { EstimatedShipment } from '../../../types/estimated-shipment.interface';

describe('useEstimatedShipment', () => {
  it('shows local deadlines only after mount and refresh of missing or legacy values', async () => {
    const timestamp = '2026-10-22T03:59:59Z';
    const shipment = ref<EstimatedShipment | undefined>({ offer_expiration_date: timestamp });
    const t = jest.fn((key: string, values: { date: string }) => key.replace('{date}', values.date));
    const services = { store: {}, router: {}, route: {}, i18n: { t } } as any;
    let result!: ReturnType<typeof useEstimatedShipment>;
    const component = defineComponent({
      setup () {
        result = useEstimatedShipment(shipment);
        expect(result.offerExpirationDateText.value).toBeUndefined();
        return {};
      },
      render: h => h('div')
    });
    const wrapper = mountWithApplicationServices(component, services);

    try {
      const expectedDate = new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      const deadline = result.offerExpirationDateText.value;

      expect(deadline).toBe(`if you order by ${expectedDate}`);
      expect(t).toHaveBeenCalledWith('if you order by {date}', { date: expectedDate });

      for (const value of [undefined, {}, { offer_expiration_date: null }, { offer_expiration_date: '' }, { offer_expiration_date: '2026-10-22' }]) {
        shipment.value = value;
        await nextTick();
        expect(result.offerExpirationDateText.value).toBeUndefined();

        shipment.value = { offer_expiration_date: timestamp };
        await nextTick();
        expect(result.offerExpirationDateText.value).toBe(deadline);
      }
    } finally {
      wrapper.destroy();
    }
  });
});
