import config from 'config';

export function getAppVersion (): string {
  return `vsf-${config.app.vsfVersion}_theme-${config.app.themeVersion}`;
}
