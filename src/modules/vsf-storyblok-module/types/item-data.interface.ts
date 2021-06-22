import { Alignment } from './alignment.value';
import SpacingSettingsField from './spacing-settings-field.interface';

export default interface ItemData {
  _uid: string,
  css_classes: string,
  alignment: Alignment,
  spacing_settings: SpacingSettingsField
}
