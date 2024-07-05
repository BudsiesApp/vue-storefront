import { OptionValue } from '../types/option-value.interface';

export function getDefaultValue (
  values: OptionValue[],
  selectedOption: string | string[] | undefined | number,
  canSelectMultipleValues: boolean
): string | string[] | undefined {
  if (typeof selectedOption === 'number') {
    return;
  }

  let defaultValue = values.find((value) => value.isDefault);
  const isArray = Array.isArray(selectedOption);

  if (!defaultValue) {
    return;
  }

  if (isArray && selectedOption.length > 0) {
    return;
  }

  if (!isArray && !!selectedOption) {
    return;
  }

  return canSelectMultipleValues ? [defaultValue.id] : defaultValue.id;
}
