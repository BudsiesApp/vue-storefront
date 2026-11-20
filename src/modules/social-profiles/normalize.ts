import { SocialNetwork } from './types/SocialNetwork';

export interface SocialProfile {
  id: number;
  position: number;
  network: SocialNetwork;
  url: string;
  count: string | null;
}

const networks: string[] = Object.values(SocialNetwork);

export function formatSocialCount (count: number): string {
  let unit: [number, string] | null = null;

  if (count >= 1e9) {
    unit = [1e9, 'B'];
  } else if (count >= 1e6) {
    unit = [1e6, 'M'];
  } else if (count >= 1e3) {
    unit = [1e3, 'K'];
  }

  if (!unit) {
    return String(count);
  }

  const tenths = Math.floor(count / (unit[0] / 10));
  return `${Math.floor(tenths / 10)}${tenths % 10 ? `.${tenths % 10}` : ''}${unit[1]}`;
}

export function normalizeSocialProfiles (hits: any[]): SocialProfile[] {
  const profiles: SocialProfile[] = [];

  for (const profile of hits) {
    if (profile.is_enabled !== true || !networks.includes(profile.network)) {
      continue;
    }

    const count = profile.subscribers_count ? formatSocialCount(profile.subscribers_count) : null;

    profiles.push({
      id: profile.id,
      position: profile.position,
      network: profile.network,
      url: profile.profile_url,
      count
    });
  }

  profiles.sort((a, b) => a.position - b.position || a.id - b.id);
  return profiles;
}
