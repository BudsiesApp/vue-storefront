import { FileUploadValue } from './file-upload-value';

export function isFileUploadValue (value: unknown): value is (FileUploadValue | FileUploadValue[]) {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length && value[0] && value[0].hasOwnProperty('storageItemId');
  }

  return value.hasOwnProperty('storageItemId');
}
