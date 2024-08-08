import { FileUploadValue } from './file-upload-value';

export interface CustomizationStateItem {
  customization_id: string,
  value: string | string[] | FileUploadValue | FileUploadValue[]
}
