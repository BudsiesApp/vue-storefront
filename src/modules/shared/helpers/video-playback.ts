import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

export const VIDEO_PLAYBACK_COLLECTION = 'videoPlayback';
export type PlaybackChoice = 'paused' | 'playing';

export function assetPlaybackKey (asset: { id?: number, filename?: string }): string {
  return asset.id !== undefined && asset.id !== null
    ? `asset:id:${asset.id}`
    : `asset:filename:${asset.filename}`;
}

export function animationPlaybackKey (identifier: string): string {
  return `animation:${identifier}`;
}

export function curatorPlaybackKey (containerId: string): string {
  return `curator:${containerId}`;
}

export function createPlaybackPreference (key: string, preview: boolean) {
  let disposed = false;
  let activated = false;
  let choice: PlaybackChoice | undefined;

  return {
    get choice () {
      return choice;
    },
    async load (apply: (value: PlaybackChoice) => void): Promise<void> {
      if (preview) {
        return;
      }

      const value = await StorageManager.get(VIDEO_PLAYBACK_COLLECTION).getItem(key);

      if (disposed || activated || (value !== 'paused' && value !== 'playing')) {
        return;
      }

      choice = value;
      apply(value);
    },
    save (value: PlaybackChoice): void {
      activated = true;
      choice = value;

      if (!preview) {
        void StorageManager.get(VIDEO_PLAYBACK_COLLECTION).setItem(key, value);
      }
    },
    dispose (): void {
      disposed = true;
    }
  };
}

export function isVideoPaused (video: HTMLVideoElement): boolean {
  return video.paused || video.ended;
}

export function applyPlaybackChoice (video: HTMLVideoElement, choice: PlaybackChoice): void {
  if (choice === 'paused') {
    video.pause();
    return;
  }

  if (video.ended) {
    video.currentTime = 0;
  }

  void video.play().catch(() => {});
}

export function bindVideoPlayback (
  video: HTMLVideoElement,
  key: string,
  preview: boolean,
  report: (paused: boolean) => void
) {
  const preference = createPlaybackPreference(key, preview);
  const update = () => report(isVideoPaused(video));
  const events = ['play', 'pause', 'ended'];
  let pendingSeek: (() => void) | undefined;

  events.forEach(event => video.addEventListener(event, update));
  update();
  void preference.load(choice => {
    if (choice === 'paused') {
      video.pause();
      const seek = () => {
        const currentTime = video.currentTime;
        video.currentTime = currentTime;
        pendingSeek = undefined;
      };

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        seek();
      } else {
        pendingSeek = seek;
        video.addEventListener('loadeddata', seek, { once: true });
      }
    }
  });

  return {
    toggle (): void {
      const choice = isVideoPaused(video) ? 'playing' : 'paused';

      applyPlaybackChoice(video, choice);
      preference.save(choice);
    },
    dispose (): void {
      preference.dispose();
      events.forEach(event => video.removeEventListener(event, update));

      if (pendingSeek) {
        video.removeEventListener('loadeddata', pendingSeek);
        pendingSeek = undefined;
      }
    }
  };
}
