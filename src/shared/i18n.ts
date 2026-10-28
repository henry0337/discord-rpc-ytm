export interface Language {
  /** Lower-case language code, plus a region only where the variants differ (zh-CN, zh-TW). */
  code: string;
  /** The language's name in itself, for the language picker. */
  name: string;
  /** Label of the Discord button that opens the track on YouTube Music. Discord caps it at 32 characters. */
  playButton: string;
  /** Label of the Discord button that opens this project's repository. Same 32-character cap. */
  repository: string;
  /** Hover text of the playback icon while a track plays and while it is paused. */
  playing: string;
  paused: string;
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', playButton: 'Play on YouTube Music', repository: 'GitHub Repository', playing: 'Playing', paused: 'Paused' },
  { code: 'vi', name: 'Tiếng Việt', playButton: 'Phát trên YouTube Music', repository: 'Kho mã nguồn GitHub', playing: 'Đang phát', paused: 'Tạm dừng' },
  { code: 'ja', name: '日本語', playButton: 'YouTube Music で再生', repository: 'GitHub リポジトリ', playing: '再生中', paused: '一時停止中' },
  { code: 'ko', name: '한국어', playButton: 'YouTube Music 에서 재생', repository: 'GitHub 리포지토리', playing: '재생 중', paused: '일시중지됨' },
  { code: 'zh-CN', name: '简体中文', playButton: '在 YouTube Music 播放', repository: 'GitHub 存储库', playing: '播放中', paused: '已暂停' },
  { code: 'zh-TW', name: '繁體中文', playButton: '在 YouTube Music 播放', repository: 'GitHub 儲存庫', playing: '播放中', paused: '已暫停' },
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
  return LANGUAGES.some((entry) => entry.code === language) ? language : FALLBACK_LANGUAGE;
}

function languageFor(locale: string): Language {
  const code = resolveLanguage(locale);
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0]!;
}

export function playButtonLabel(locale: string): string {
  return languageFor(locale).playButton;
}

export function repositoryButtonLabel(locale: string): string {
  return languageFor(locale).repository;
}

export function playbackLabel(locale: string, paused: boolean): string {
  const language = languageFor(locale);
  return paused ? language.paused : language.playing;
}
