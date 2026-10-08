// YouTube Music writes titles of songs in other scripts as "original - Latin version", e.g.
// "ひとひら - Hitohira". Other services (and the artists) use the original alone, so this drops the
// Latin part. It is a heuristic, which is why it can be switched off.

import { hasNonLatinLetter, isLatinName } from './script.ts';

const SEPARATOR = ' - ';

// A second part made of these words is a version label ("Live", "TV Size"), not a Latin version of
// the name, so it must stay.
const VERSION_WORDS = new Set([
  'instrumental', 'inst', 'live', 'remix', 'remixed', 'remaster', 'remastered', 'acoustic', 'version',
  'ver', 'edit', 'mix', 'cover', 'size', 'tv', 'off', 'vocal', 'karaoke', 'demo', 'ost', 'theme',
  'opening', 'ending', 'short', 'full', 'feat', 'ft', 'prod', 'mv', 'audio', 'lyric', 'lyrics',
  'video', 'original', 'extended', 'radio', 'club', 'remake', 'rearranged', 'reprise', 'intro',
  'outro', 'bonus', 'deluxe', 'anniversary', 'session', 'unplugged', 'piano', 'orchestra',
  'orchestral', 'cappella', 'acapella', 'sped', 'slowed', 'reverb', 'nightcore',
]);

// "Name (Remastered 2024)": the name, then any number of bracketed notes.
const TRAILING_NOTES = /^(.*?)((?:\s*[(\[（【][^)\]）】]*[)\]）】])*)\s*$/u;

function isVersionLabel(text: string): boolean {
  return (text.toLowerCase().match(/[a-z]+/g) ?? []).some((word) => VERSION_WORDS.has(word));
}

export function originalTitle(title: string): string {
  const parts = title.trim().split(SEPARATOR).map((part) => part.trim());
  const [original, latin, ...rest] = parts;
  if (original === undefined || latin === undefined) return title;
  if (!hasNonLatinLetter(original)) return title;

  const [, name = '', notes = ''] = TRAILING_NOTES.exec(latin) ?? [];
  if (name === '' || !isLatinName(name) || isVersionLabel(name)) return title;

  return [original + notes, ...rest].join(SEPARATOR);
}
