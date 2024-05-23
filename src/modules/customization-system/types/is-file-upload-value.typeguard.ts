import { FileUploadValue } from './file-upload-value';

export function isFileUploadValue (value: unknown): value is (FileUploadValue | FileUploadValue[]) {
  if (!value) {
    return false;
  }

  const fields = [
    'id',
    'url'
  ]

  if (Array.isArray(value)) {
    const item = value[0];
    return item && fields.every((fieldName) => item.hasOwnProperty(fieldName));
  }

  return fields.every((fieldName) => value.hasOwnProperty(fieldName));
}
