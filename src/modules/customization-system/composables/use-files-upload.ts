import { inject, computed, Ref, SetupContext, onMounted, nextTick, ref } from '@vue/composition-api';

import { ImageHandlerService, Item } from 'src/modules/file-storage';
import { CustomerImage } from 'src/modules/shared';

function getCustomerImageByStorageItemId (
  storageItemId: string,
  imageHandlerService: ImageHandlerService
): CustomerImage {
  return {
    id: storageItemId,
    url: imageHandlerService.getOriginalImageUrl(storageItemId)
  };
}

function getInitialItems (value: string | string[] | undefined, imageHandlerService: ImageHandlerService): CustomerImage[] {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    return [getCustomerImageByStorageItemId(value, imageHandlerService)]
  }

  return value.map((item) => getCustomerImageByStorageItemId(item, imageHandlerService));
}

export function useFilesUpload (
  value: Ref<string | string[] | undefined>,
  maxValuesCount: Ref<number | undefined>,
  { emit }: SetupContext
) {
  const imageHandlerService = inject<ImageHandlerService>('ImageHandlerService');

  if (!imageHandlerService) {
    throw new Error('ImageHandlerService is not defined');
  }

  let initialItems = ref<CustomerImage[]>([]);
  const allowMultiple = computed<boolean>(() => {
    return !maxValuesCount.value || maxValuesCount.value > 1;
  });
  const maxFiles = computed<number | null>(() => {
    return maxValuesCount.value || null;
  });

  function onFileAdded (item: Item): void {
    if (!allowMultiple.value) {
      emit('input', item.id);
      return;
    }

    if (!value.value) {
      return emit('input', [item.id]);
    }

    if (!Array.isArray(value.value)) {
      return emit('input', [value.value, item.id]);
    }

    emit('input', [...value.value, item.id]);
  }

  function onFileRemoved (storageItemId: string) {
    if (!allowMultiple.value) {
      return emit('input', undefined);
    }

    if (!Array.isArray(value.value)) {
      return emit('input', []);
    }

    emit('input', value.value.filter((item) => item !== storageItemId));
  }

  onMounted(async () => {
    await nextTick();
    // TODO: current version of TS resolve type incorrect
    (initialItems as any).value = getInitialItems(value.value, imageHandlerService);
  });

  return {
    allowMultiple,
    initialItems,
    maxFiles,
    onFileAdded,
    onFileRemoved
  }
}
