import { ConsentSelection } from '../marketing-consent';

export interface ConsentState {
  selection: ConsentSelection | null;
  hydrated: boolean;
}
