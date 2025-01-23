import { OptionValue } from '../types/option-value.interface';

function isSpecialPriceAvailable (
  optionValue: OptionValue
): boolean {
  if (!optionValue.specialPriceFromDate && !optionValue.specialPriceToDate) {
    return true;
  }

  const now = new Date()
  const fromDate = optionValue.specialPriceFromDate ? new Date(optionValue.specialPriceFromDate) : undefined
  const toDate = optionValue.specialPriceToDate ? new Date(optionValue.specialPriceToDate) : undefined

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
