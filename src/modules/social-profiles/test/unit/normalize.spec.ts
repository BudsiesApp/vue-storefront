import { formatSocialCount, normalizeSocialProfiles } from '../../normalize';

const profile = {
  id: 1,
  position: 1,
  network: 'youtube',
  is_enabled: true,
  profile_url: 'https://example.com/',
  display_subscribers: true,
  subscribers_count: 0
};

describe('social profiles', () => {
  it.each([
    [999, '999'],
    [1000, '1K'],
    [1250, '1.2K'],
    [999999, '999.9K'],
    [1000000, '1M'],
    [2549000, '2.5M'],
    [1000000000, '1B'],
    [1200000000, '1.2B']
  ])('formats %i as %s', (value, expected) => {
    expect(formatSocialCount(value)).toBe(expected);
  });

  it('filters and orders profiles by position then id', () => {
    const result = normalizeSocialProfiles([
      { ...profile, id: 3 },
      { ...profile, id: 2 },
      { ...profile, id: 4, position: 0 },
      { ...profile, is_enabled: false },
      { ...profile, network: 'unknown' }
    ]);
    expect(result.map(item => item.id)).toEqual([4, 2, 3]);
    expect(result[0].count).toBeNull();
  });

  it('uses the exported destination unchanged', () => {
    const url = 'https://example.com/profile?source=test';
    expect(normalizeSocialProfiles([{ ...profile, profile_url: url }])[0].url).toBe(url);
  });

  it.each([0, null])('omits count %p but keeps the link', count => {
    expect(normalizeSocialProfiles([{ ...profile, subscribers_count: count }])).toEqual([{
      id: 1,
      position: 1,
      network: 'youtube',
      url: 'https://example.com/',
      count: null
    }]);
  });
});
