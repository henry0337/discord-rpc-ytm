export interface Language {
  /** Lower-case language code, plus a region only where the variants differ (zh-CN, zh-TW, pt-BR). */
  code: string;
  /** The language's name in itself, for the language picker. */
  name: string;
  /** Label of the Discord button that opens the track on YouTube Music. Discord caps it at 32 characters. */
  playButton: string;
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', playButton: 'Play on YouTube Music (Web)' },
  { code: 'vi', name: 'Tiếng Việt', playButton: 'Phát trên YouTube Music (Web)' },
  { code: 'ja', name: '日本語', playButton: 'YouTube Music (Web)で再生' },
  { code: 'ko', name: '한국어', playButton: 'YouTube Music(웹)에서 재생' },
  { code: 'zh-CN', name: '简体中文', playButton: '在 YouTube Music（网页版）播放' },
  { code: 'zh-TW', name: '繁體中文', playButton: '在 YouTube Music（網頁版）播放' },
  { code: 'fr', name: 'Français', playButton: 'Écouter sur YouTube Music (Web)' },
  { code: 'de', name: 'Deutsch', playButton: 'Auf YouTube Music (Web) hören' },
  { code: 'es', name: 'Español', playButton: 'Escuchar en YouTube Music (Web)' },
  { code: 'pt-BR', name: 'Português (Brasil)', playButton: 'Ouvir no YouTube Music (Web)' },
  { code: 'it', name: 'Italiano', playButton: 'Ascolta su YouTube Music (Web)' },
  { code: 'ru', name: 'Русский', playButton: 'Слушать в YouTube Music (веб)' },
  { code: 'uk', name: 'Українська', playButton: 'Слухати в YouTube Music (веб)' },
  { code: 'pl', name: 'Polski', playButton: 'Odtwórz w YouTube Music (Web)' },
  { code: 'nl', name: 'Nederlands', playButton: 'Afspelen op YouTube Music (Web)' },
  { code: 'tr', name: 'Türkçe', playButton: "YouTube Music'te dinle (Web)" },
  { code: 'th', name: 'ไทย', playButton: 'เล่นบน YouTube Music (เว็บ)' },
  { code: 'hi', name: 'हिन्दी', playButton: 'YouTube Music (वेब) पर चलाएं' },
];

const FALLBACK_LANGUAGE = 'en';
const TRADITIONAL_CHINESE_SUBTAGS = new Set(['tw', 'hk', 'mo', 'hant']);

/** Maps a BCP 47 locale such as "vi-VN" or "zh_TW" to the code of the closest supported language. */
export function resolveLanguage(locale: string): string {
  const normalized = locale.trim().replace(/_/g, '-').toLowerCase();
  if (!/^[a-z]{2,3}(-[a-z0-9]+)*$/.test(normalized)) return FALLBACK_LANGUAGE;

  const [language = '', ...subtags] = normalized.split('-');
  if (language === 'zh') {
    return subtags.some((subtag) => TRADITIONAL_CHINESE_SUBTAGS.has(subtag)) ? 'zh-TW' : 'zh-CN';
  }
  if (language === 'pt') return 'pt-BR';
  return LANGUAGES.some((entry) => entry.code === language) ? language : FALLBACK_LANGUAGE;
}

export function playButtonLabel(locale: string): string {
  const code = resolveLanguage(locale);
  return (LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0]!).playButton;
}
