import { PersistedBillingAddress } from 'src/modules/shared';

export interface StoreState {
  email: string | undefined,
  firstName: string | undefined,
  lastName: string | undefined,
  phoneNumber: string | undefined,
  shippingCountry: string | undefined,
  shippingCountrySettled: boolean,
  vatId: string | undefined,
  lastUsedCustomerBillingAddress: PersistedBillingAddress
}
