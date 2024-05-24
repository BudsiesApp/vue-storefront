import { FileUploadValue } from './file-upload-value';

export interface CustomizationStateItem {
  customizationId: string,
  value: string | FileUploadValue
}
