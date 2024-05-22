import { inject, computed, Ref, SetupContext, onMounted, nextTick, ref } from '@vue/composition-api';

import { ImageHandlerService, Item } from 'src/modules/file-storage';
import { CustomerImage } from 'src/modules/shared';
import { FileUploadValue } from '../types/file-upload-value';

function getCustomerImageByStorageItemId (
  fileUploadValue: FileUploadValue,
  imageHandlerService: ImageHandlerService
): CustomerImage {
  return {
    id: fileUploadValue.storageItemId,
    url: imageHandlerService.getOriginalImageUrl(fileUploadValue.storageItemUrl)
  };
}

function getInitialItems (
  value: FileUploadValue | FileUploadValue[] | undefined,
  imageHandlerService: ImageHandlerService
): CustomerImage[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => getCustomerImageByStorageItemId(item, imageHandlerService));
  }

  return [getCustomerImageByStorageItemId(value, imageHandlerService)]
}

export function useFilesUpload (
  value: Ref<FileUploadValue | FileUploadValue[] | undefined>,
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
    const fileUploadValue: FileUploadValue = {
      storageItemId: item.id,
      storageItemUrl: item.url
    };

    if (!allowMultiple.value) {
      emit('input', fileUploadValue);
      return;
    }

    if (!value.value) {
      return emit('input', [fileUploadValue]);
    }

    if (!Array.isArray(value.value)) {
      return emit('input', [value.value, fileUploadValue]);
    }

    emit('input', [...value.value, fileUploadValue]);
  }

  function onFileRemoved (storageItemId: string) {
    if (!allowMultiple.value) {
      return emit('input', undefined);
    }

    if (!Array.isArray(value.value)) {
      return emit('input', []);
    }

    emit(
      'input',
      value.value.filter((item) => item.storageItemId !== storageItemId)
    );
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
