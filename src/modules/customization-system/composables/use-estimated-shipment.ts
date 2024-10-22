import { computed, Ref } from '@vue/composition-api';

import i18n from '@vue-storefront/core/i18n';

import { EstimatedShipment } from '../types/estimated-shipment.interface';

const estimatedDateTemplateVariable = '{estimatedShipment}';

export function useEstimatedShipment (
  estimatedShipment: Ref<EstimatedShipment | undefined>
) {
  const estimatedShipmentDate = computed<Date | undefined>(() => {
    if (!estimatedShipment.value?.turnaround_time) {
      return;
    }

    let date = new Date();
    date.setDate(date.getDate() + estimatedShipment.value.turnaround_time);

    return date;
  });

  const shipmentPromiseText = computed<string | undefined>(() => {
    const shipmentPromiseTemplate = estimatedShipment.value?.shipment_promise_template;

    if (!shipmentPromiseTemplate) {
      return;
    }

    if (!estimatedShipmentDate.value) {
      return shipmentPromiseTemplate;
    }

    return shipmentPromiseTemplate.replace(
      estimatedDateTemplateVariable,
      estimatedShipmentDate.value.toLocaleDateString()
    ).replace(';', ';<br>');
  });

  const offerExpirationDateText = computed<string | undefined>(() => {
    if (!estimatedShipment.value?.offer_expiration_date) {
      return;
    }

    const date = new Date(estimatedShipment.value.offer_expiration_date);

    return i18n.t(
      'Estimated shipment date is valid if you place your order before {date}',
      {
        date: date.toLocaleDateString()
      }
    ).toString();
  });

  return {
    offerExpirationDateText,
    shipmentPromiseText
  }
}
