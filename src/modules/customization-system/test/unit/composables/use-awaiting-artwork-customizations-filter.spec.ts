import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';

import { BudsieStatus } from 'src/modules/shared';

import { useAwaitingArtworkCustomizationsFilter } from '../../../composables/use-awaiting-artwork-customizations-filter';
import { useAvailableCustomizations } from '../../../composables/use-available-customizations';
import { useCustomizationState } from '../../../composables/use-customization-state';
import { Customization } from '../../../types/customization.interface';
import { CustomizationStateItem } from '../../../types/customization-state-item.interface';
import { CustomizationType } from '../../../types/customization-type';
import { DraftOrderItem } from '../../../types/draft-order-item.interface';
import { WidgetType } from '../../../types/widget-type';

jest.mock('src/modules/shared', () => jest.requireActual('src/modules/shared/types/budsie-status'));
jest.mock('src/modules/customization-system', () => ({}));

const photoGroupId = '01b4f3aa-a1bc-4707-9dff-85cbf8e672ec';
const petInfoGroupId = '81cbfa57-121e-499e-afba-9c21cee59f37';
const imageId = 'f6971232-0087-4f14-9823-5f9bbfe32cff';
const uploadMethodId = '0e5ef79e-1d82-414c-96a8-004a4f836442';
const nameId = '25dcd8a5-d67e-4151-b17c-85badd061f24';
const noId = '2479f37d-b3f6-4f0c-be13-c5688b0bbb62';
const yesId = '2ba58d1b-e8a2-48f0-aede-0f901186e828';
const photo = { id: 'saved-photo', url: '/saved-photo.jpg' };

function customization (id: string, name: string, widget?: WidgetType, parentId?: string): Customization {
  return {
    id, name, parentId,
    type: widget ? CustomizationType.OPTION : CustomizationType.OPTIONS_GROUP,
    isEnabled: true, isLocked: false, showInCart: false, sn: 1,
    availabilityRules: {},
    optionData: widget ? { displayWidget: widget, isRequired: true, values: [] } : undefined
  };
}

function fixture (status = BudsieStatus.AWAITING_ARTWORK) {
  const image = customization(imageId, 'Customer Image', WidgetType.IMAGE_UPLOAD, photoGroupId);
  image.availabilityRules = { forActivatedOptionValueIds: [noId] };
  const uploadMethod = customization(uploadMethodId, 'Send Later Upload Method', WidgetType.CHECKBOX, photoGroupId);
  uploadMethod.optionData.values = [
    { id: noId, name: 'No', isEnabled: true, isDefault: true, sn: 2 },
    { id: yesId, name: 'Yes', isEnabled: true, isDefault: false, sn: 1 }
  ];
  const customizations = ref<Customization[]>([
    customization(photoGroupId, 'Photo'), image, uploadMethod,
    customization(petInfoGroupId, 'Pet Info'),
    customization(nameId, 'Name', WidgetType.TEXT_INPUT, petInfoGroupId)
  ]);
  const initialState = ref<CustomizationStateItem[]>([
    { customization_id: uploadMethodId, value: yesId, quantity: 1 },
    { customization_id: nameId, value: 'Rex', quantity: 1 },
    { customization_id: imageId, value: [photo], quantity: 2 }
  ]);
  const draft = ref<DraftOrderItem | undefined>({ id: 7, status_id: status, customization_state: initialState.value });
  return { customizations, initialState, draft };
}

it('copies images without availability rules, retains groups and complete image state without mutating inputs', () => {
  const { customizations, initialState, draft } = fixture();
  const before = JSON.stringify({ product: customizations.value, draft: draft.value });
  const result = useAwaitingArtworkCustomizationsFilter(customizations, initialState, draft);

  expect(result.productCustomizations.value.map(item => item.id)).toEqual([photoGroupId, imageId, petInfoGroupId]);
  expect(result.productCustomizations.value[0]).toBe(customizations.value[0]);
  expect(result.productCustomizations.value[2]).toBe(customizations.value[3]);
  expect(result.productCustomizations.value[1]).not.toBe(customizations.value[1]);
  expect(result.productCustomizations.value[1]).not.toHaveProperty('availabilityRules');
  const { availabilityRules, ...image } = customizations.value[1];
  expect(result.productCustomizations.value[1]).toEqual(image);
  expect(result.initialCustomizationState.value).toEqual([initialState.value[2]]);
  expect(result.initialCustomizationState.value[0]).toBe(initialState.value[2]);
  expect(JSON.stringify({ product: customizations.value, draft: draft.value })).toBe(before);
});

it('returns original input values for Awaiting customization and no draft', () => {
  const { customizations, initialState, draft } = fixture(BudsieStatus.AWAITING_CUSTOMIZATION);
  const result = useAwaitingArtworkCustomizationsFilter(customizations, initialState, draft);
  expect(result.productCustomizations.value).toBe(customizations.value);
  expect(result.initialCustomizationState.value).toBe(initialState.value);
  draft.value = undefined;
  expect(result.productCustomizations.value).toBe(customizations.value);
  expect(result.initialCustomizationState.value).toBe(initialState.value);
});

it('discards restored non-image values in the same tick while retaining the available photo and quantity', () => {
  const { customizations, initialState, draft } = fixture();
  const filtered = useAwaitingArtworkCustomizationsFilter(customizations, initialState, draft);
  const wrapper = mount(defineComponent({
    setup () {
      const state = useCustomizationState();
      const availability = useAvailableCustomizations(
        filtered.productCustomizations, state.selectedOptionValuesIds,
        state.customizationOptionValue, state.updateCustomizationOptionValue
      );
      state.mergeCustomizationState(initialState.value);
      availability.removeUnavailableOptionValues();
      expect(state.customizationState.value).toEqual([initialState.value[2]]);
      expect(availability.availableOptionCustomizations.value.map(item => item.id)).toEqual([imageId]);
      return {};
    },
    render: h => h('div')
  }));
  wrapper.destroy();
});
