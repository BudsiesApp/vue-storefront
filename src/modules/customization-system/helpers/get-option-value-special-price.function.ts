import { OptionValue } from '../types/option-value.interface';

function isSpecialPriceAvailable (
  optionValue: OptionValue
): boolean {
  if (!optionValue.specialFromDate && !optionValue.specialToDate) {
    return true;
  }

  const now = new Date()
  const fromDate = optionValue.specialFromDate ? new Date(optionValue.specialFromDate) : undefined
  const toDate = optionValue.specialToDate ? new Date(optionValue.specialToDate) : undefined

  const isFromDateAvailable = !fromDate || fromDate < now;
  const isToDateAvailable = !toDate || toDate > now;

  return isFromDateAvailable && isToDateAvailable;
}

export function getOptionValueSpecialPrice (optionValue: OptionValue): number | null {
  if (optionValue.specialPrice === null || optionValue.specialPrice === undefined) {
    return null;
  }

  if (!isSpecialPriceAvailable(optionValue)) {
    return null;
  }

  return optionValue.specialPrice;
}
