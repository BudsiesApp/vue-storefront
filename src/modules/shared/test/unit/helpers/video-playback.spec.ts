import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import {
  animationPlaybackKey, applyPlaybackChoice, assetPlaybackKey, bindVideoPlayback,
  curatorPlaybackKey, VIDEO_PLAYBACK_COLLECTION
} from '../../../helpers/video-playback';

jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));

function media () {
  const video = document.createElement('video');
  let paused = true;
  let ended = false;
  Object.defineProperties(video, {
    paused: { get: () => paused }, ended: { get: () => ended }
  });
  video.play = jest.fn(() => {
    paused = false;
    ended = false;
    video.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  video.pause = jest.fn(() => { paused = true; video.dispatchEvent(new Event('pause')); });
  return { video, end: () => { ended = true; video.dispatchEvent(new Event('ended')); } };
}

describe('video playback', () => {
  const getItem = jest.fn();
  const setItem = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    getItem.mockResolvedValue(null);
    (StorageManager.get as jest.Mock).mockReturnValue({ getItem, setItem });
  });

  it('uses asset id presence, filename fallback and separate identity namespaces', () => {
    expect(assetPlaybackKey({ id: 0, filename: 'old-cdn' })).toBe('asset:id:0');
    expect(assetPlaybackKey({ id: 0, filename: 'new-cdn' })).toBe('asset:id:0');
    expect(assetPlaybackKey({ filename: 'raw-file' })).toBe('asset:filename:raw-file');
    expect(animationPlaybackKey('loading_animation')).toBe('animation:loading_animation');
    expect(curatorPlaybackKey('feed')).toBe('curator:feed');
  });

  it('reports initial blocked autoplay and media events without writing preferences', () => {
    const { video, end } = media();
    const report = jest.fn();
    const binding = bindVideoPlayback(video, 'asset:id:1', false, report);
    expect(report).toHaveBeenLastCalledWith(true);
    void video.play();
    expect(report).toHaveBeenLastCalledWith(false);
    video.pause();
    expect(report).toHaveBeenLastCalledWith(true);
    end();
    expect(report).toHaveBeenLastCalledWith(true);
    expect(setItem).not.toHaveBeenCalled();
    binding.dispose();
    report.mockClear();
    void video.play();
    expect(report).not.toHaveBeenCalled();
  });

  it('plays directly in the gesture before persistence and restarts ended media', () => {
    const { video, end } = media();
    const binding = bindVideoPlayback(video, 'asset:id:1', false, jest.fn());
    setItem.mockImplementation(() => expect(video.play).toHaveBeenCalled());
    binding.toggle();
    expect(setItem).toHaveBeenLastCalledWith('asset:id:1', 'playing');
    binding.toggle();
    expect(video.pause).toHaveBeenCalled();
    expect(setItem).toHaveBeenLastCalledWith('asset:id:1', 'paused');
    video.currentTime = 9;
    end();
    binding.toggle();
    expect(video.currentTime).toBe(0);
    binding.dispose();
  });

  it('catches and ignores rejected play requests', async () => {
    const { video } = media();
    const rejection = Promise.reject(new DOMException('Playback interrupted', 'AbortError'));
    const catchRejection = jest.spyOn(rejection, 'catch');
    video.play = jest.fn(() => rejection);

    applyPlaybackChoice(video, 'playing');

    expect(catchRejection).toHaveBeenCalledTimes(1);
    await expect(catchRejection.mock.results[0].value).resolves.toBeUndefined();
  });

  it('seeks immediately when restoring a saved paused choice with data available', async () => {
    getItem.mockResolvedValue('paused');
    const { video } = media();
    video.currentTime = 3;
    Object.defineProperty(video, 'readyState', { value: HTMLMediaElement.HAVE_CURRENT_DATA });
    const seek = jest.spyOn(video, 'currentTime', 'set');
    const binding = bindVideoPlayback(video, 'key', false, jest.fn());

    await Promise.resolve();

    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenCalledWith(3);
    binding.dispose();
    seek.mockRestore();
  });

  it('defers the restore seek until loadeddata and cancels it on disposal', async () => {
    getItem.mockResolvedValue('paused');

    for (const disposeBeforeData of [false, true]) {
      const { video } = media();
      video.currentTime = 3;
      const seek = jest.spyOn(video, 'currentTime', 'set');
      const binding = bindVideoPlayback(video, 'key', false, jest.fn());

      await Promise.resolve();

      expect(video.pause).toHaveBeenCalledTimes(1);
      expect(seek).not.toHaveBeenCalled();

      if (disposeBeforeData) {
        binding.dispose();
      }

      video.dispatchEvent(new Event('loadeddata'));

      if (disposeBeforeData) {
        expect(seek).not.toHaveBeenCalled();
      } else {
        expect(seek).toHaveBeenCalledTimes(1);
        expect(seek).toHaveBeenCalledWith(3);
        video.dispatchEvent(new Event('loadeddata'));
        expect(seek).toHaveBeenCalledTimes(1);
      }

      binding.dispose();
      seek.mockRestore();
    }
  });

  it.each(['paused', 'playing', null])('restores asynchronous %p without forcing startup', async choice => {
    getItem.mockResolvedValue(choice);
    const { video } = media();
    const binding = bindVideoPlayback(video, 'key', false, jest.fn());
    expect(video.pause).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(video.pause).toHaveBeenCalledTimes(choice === 'paused' ? 1 : 0);
    expect(video.play).not.toHaveBeenCalled();
    expect(StorageManager.get).toHaveBeenCalledWith(VIDEO_PLAYBACK_COLLECTION);
    binding.dispose();
  });

  it.each(['click', 'replacement', 'disposal'])('ignores a pending read after %s', async action => {
    let resolveRead = (_value: string) => {};
    getItem.mockReturnValueOnce(new Promise(resolve => { resolveRead = resolve; }));
    const { video } = media();
    const binding = bindVideoPlayback(video, 'old', false, jest.fn());
    if (action === 'click') binding.toggle();
    else binding.dispose();
    const replacement = action === 'replacement'
      ? bindVideoPlayback(media().video, 'new', false, jest.fn()) : undefined;
    resolveRead('paused');
    await Promise.resolve();
    expect(video.pause).not.toHaveBeenCalled();
    binding.dispose();
    replacement?.dispose();
  });
});
