import { Dictionary } from 'src/modules/budsies';

import { UrlRewrite } from './url-rewrite.interface';

export interface State {
  urlRewrite: Dictionary<UrlRewrite>
}
