import { OptionValue } from '../types/option-value.interface';

export function getDefaultValue (
  values: OptionValue[],
  selectedOption: string | string[] | undefined,
  isRequired: boolean
): string | string[] | undefined {
  let defaultValue = values.find((value) => value.isDefault);
  const isArray = Array.isArray(selectedOption);

  if (!defaultValue && isRequired) {
    defaultValue = values[0];
  }

  if (!defaultValue) {
    return;
  }

  if (isArray && selectedOption.length > 0) {
    return;
  }

  if (typeof selectedOption === 'string' && !!selectedOption) {
    return;
  }

  return isArray ? [defaultValue.id] : defaultValue.id;
}
