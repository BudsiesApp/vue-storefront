import { computed, onMounted, ref, Ref } from 'vue';

import { useI18n } from '@vue-storefront/core/application-services';

import { EstimatedShipment } from '../types/estimated-shipment.interface';

const estimatedDateTemplateVariable = '{estimatedShipment}';
const estimatedDateTemplateVariableRegExp = new RegExp(estimatedDateTemplateVariable, 'g');

export function useEstimatedShipment (
  estimatedShipment: Ref<EstimatedShipment | undefined>
) {
  const { t } = useI18n();
  const mounted = ref(false);

  onMounted(() => {
    mounted.value = true;
  });

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
      estimatedDateTemplateVariableRegExp,
      estimatedShipmentDate.value.toLocaleDateString()
    ).replace(/;/g, ';<br>');
  });

  const offerExpirationDateText = computed<string | undefined>(() => {
    const expiration = estimatedShipment.value?.offer_expiration_date;

    if (!mounted.value || !expiration || /^\d{4}-\d{2}-\d{2}$/.test(expiration)) {
      return;
    }

    const date = new Date(expiration);

    return t(
      'if you order by {date}',
      {
        date: new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        }).format(date)
      }
    ).toString();
  });

  return {
    offerExpirationDateText,
    shipmentPromiseText
  }
}
