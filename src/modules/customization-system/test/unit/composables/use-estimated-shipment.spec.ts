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
      const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      const expected = timeZone === 'America/New_York'
        ? /October 21, 2026.*11:59\s*PM.*(?:EDT|GMT-4)/
        : timeZone === 'UTC' ? /October 22, 2026.*3:59\s*AM.*(?:UTC|GMT)/ : undefined;
      const deadline = result.offerExpirationDateText.value;

      if (expected) {
        expect(deadline).toMatch(expected);
      }
      expect(deadline).toMatch(/^if you order by .+/);
      expect(t).toHaveBeenCalledWith('if you order by {date}', { date: expect.any(String) });

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
