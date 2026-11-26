export const VIDEO_PLAYBACK_BUTTON_CLASS = 'video-playback-toggle';
export const VIDEO_PLAYBACK_ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l14-8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h5v16H5zm9 0h5v16h-5z"/></svg>'
};

export function playbackButtonIcon (paused: boolean): string {
  return paused ? VIDEO_PLAYBACK_ICONS.play : VIDEO_PLAYBACK_ICONS.pause;
}
