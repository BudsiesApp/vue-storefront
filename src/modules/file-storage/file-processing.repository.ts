import axios, { AxiosRequestConfig } from 'axios';

import { ObjectBuilderInterface } from 'src/modules/budsies';
import { ImageType } from './image-type.value';
import Item from './item.model';
import ItemApiResponse from './item-api-response.interface';
import isItemApiResponse from './is-item-api-response.typeguard';
import getMimeTypeFromExtension from './get-mime-type-from-extension.function';
import getExtensionFromFileName from './get-extension-from-file-name.function';

export default class FileProcessingRepository {
  public constructor (
    private uploadUrl: string,
    private factory: ObjectBuilderInterface<
    Item,
    ItemApiResponse
    >
  ) {}

  public async uploadFile (
    file: File | Blob,
    imageType: ImageType,
    product?: string,
    onUploadProgress?: (progressEvent: ProgressEvent) => void
  ): Promise<Item> {
    const formData = new FormData();
    const fileName = file instanceof File ? file.name : 'filename';

    formData.append('file', file, fileName);

    formData.append('imageType', imageType.toString());

    if (product) {
      formData.append('product', product);
    }

    const options: AxiosRequestConfig = {
      onUploadProgress,
      headers: {
        Accept: 'application/ld+json',
        'Content-type': 'application/ld+json'
      }
    };

    const result = await axios.post(this.uploadUrl, formData, options);
    const data = result.data['item'];

    if (!isItemApiResponse(data)) {
      throw new Error('Unexpected response!');
    }

    return this.factory(data);
  }

  public async uploadFileFromUrl (
    fileUrl: string,
    imageType: ImageType,
    product?: string,
    onUploadProgress?: (progressEvent: ProgressEvent) => void
  ): Promise<Item> {
    const fileExtension = getExtensionFromFileName(fileUrl);
    const mimeType = getMimeTypeFromExtension(fileExtension);

    const options: AxiosRequestConfig = {
      responseType: 'blob',
      headers: {
        Accept: mimeType,
        'Content-type': mimeType
      }
    };

    const response = await axios.get(fileUrl, options);

    return this.uploadFile(
      response.data,
      imageType,
      product,
      onUploadProgress
    );
  }
}
