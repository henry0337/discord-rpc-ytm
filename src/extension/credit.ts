// For songs in other scripts, YouTube Music appends who is featured to the title, worded in the
// interface language ("(feat. X)", "(cùng với X)", "(X ilə)"...). Those wordings are too many and too
// irregular to parse, but in English, and in Japanese, the credit is always "(feat. NAMES)", so
// that is the only form read here; the extension asks for the English title to get it.

import { hasNonLatinLetter } from './script.ts';

export interface Credit {
  /** The title without the credit. */
  baseTitle: string;
  /** The featured names, as YouTube Music writes them. */
  names: string[];
}

// "Title (feat. A, B & C)", with ASCII or full-width brackets, at the very end.
const TRAILING_CREDIT = /^(.*?)\s*[(（]\s*feat\.\s*([^()（）]*?)\s*[)）]\s*$/iu;
// Names are separated by commas and a final "&" (or the Japanese comma).
const NAME_SEPARATOR = /\s*[,、，]\s*|\s+&\s+/u;

/**
 * Splits a title into its text and its "(feat. …)" credit. Only titles with non-Latin letters are
 * handled: for Latin titles the credit is usually part of the real title, which stays as it is.
 */
export function parseCredit(title: string): Credit | null {
  const match = TRAILING_CREDIT.exec(title);
  if (!match) return null;

  const baseTitle = (match[1] ?? '').trim();
  const names = (match[2] ?? '')
    .split(NAME_SEPARATOR)
    .map((name) => name.trim())
    .filter((name) => name !== '');
  if (baseTitle === '' || names.length === 0 || !hasNonLatinLetter(baseTitle)) return null;

  return { baseTitle, names };
}

/**
 * Whether a title in the user's interface language might carry a credit worded in that language,
 * so that it is worth asking for the English one. A credit always closes a bracket.
 */
export function mayCarryCredit(title: string): boolean {
  return hasNonLatinLetter(title) && /[)）]\s*$/u.test(title);
}
