import MetaTagsField from './metatags-field.interface';
import { ParentData } from './parent-data.interface';

export default interface PageData {
  description: unknown[],
  display_name?: boolean,
  body: any[],
  metatags: MetaTagsField,
  parent?: ParentData
}
