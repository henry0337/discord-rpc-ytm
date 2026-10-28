import type { TrackDetails } from './trackDetails.ts';

// YouTube Music writes names in the language of the interface: for Japanese music in any other
// language, "Kaya Mizuki" for 水樹カヤ and "Title - Romaji" for the title. Asking for the same track
// in Japanese gives the original names back (same channels, same IDs), which is what other services
// show. It is only asked for Japanese music: in Japanese, a Western artist becomes "テイラー・スウィフト".

export const NATIVE_LANGUAGE = 'ja';

const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** Kana is only used by Japanese, unlike Han characters, which Chinese shares. */
export function hasKana(text: string): boolean {
  return KANA.test(text);
}

/** The title is in Japanese: sure enough to ask for the Japanese names and to remember the artist. */
export function hasJapaneseTitle(details: TrackDetails): boolean {
  return details.title !== null && hasKana(details.title);
}

/** The channel of the first artist, when this track is what proves it Japanese. */
export function channelToLearn(details: TrackDetails): string | null {
  return hasJapaneseTitle(details) ? (details.artists[0]?.channelId ?? null) : null;
}

/**
 * Whether the Japanese names are worth asking for: the title is Japanese, or the first artist is one
 * seen often enough on Japanese titles (which covers their songs titled in Latin letters).
 */
export function wantsNative(details: TrackDetails, confirmed: ReadonlySet<string>): boolean {
  if (hasJapaneseTitle(details)) return true;

  const first = details.artists[0]?.channelId;
  return first !== undefined && first !== null && confirmed.has(first);
}

/**
 * Puts the names of the Japanese response over the details. Null when it does not describe the same
 * track and the same artists (the channel IDs are what proves it), so a surprise cannot swap names.
 */
export function useNative(details: TrackDetails, native: TrackDetails): TrackDetails | null {
  if (native.videoId !== details.videoId || native.title === null) return null;
  if (details.artists.length === 0 || native.artists.length !== details.artists.length) return null;
  if (native.artists.some((artist, index) => artist.channelId !== details.artists[index]?.channelId)) return null;

  const sameAlbum = native.albumId === details.albumId;
  return {
    ...details,
    title: native.title,
    artists: native.artists,
    albumName: sameAlbum ? (native.albumName ?? details.albumName) : details.albumName,
    // The credit read from the interface language's title belongs to a title that is no longer used.
    credit: native.credit,
  };
}
