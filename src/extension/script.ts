// Which writing system a piece of text uses, by Unicode script.

const LETTER = /\p{L}/u;
const LATIN = /\p{Script=Latin}/u;

/** True when the text has a letter from a script other than Latin (Japanese, Korean, Cyrillic...). */
export function hasNonLatinLetter(text: string): boolean {
  for (const character of text) {
    if (LETTER.test(character) && !LATIN.test(character)) return true;
  }
  return false;
}

/** True when the text has Latin letters and no letters from any other script. */
export function isLatinName(text: string): boolean {
  return LATIN.test(text) && !hasNonLatinLetter(text);
}
