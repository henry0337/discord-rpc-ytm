import { LANGUAGES } from './i18n.ts';

/** The language setting meaning "follow the browser's UI language". */
export const AUTO_LANGUAGE = 'auto';

/** Which part of the activity Discord shows next to the user's name. */
export type StatusText = 'app' | 'title' | 'artist';
export type WhenPaused = 'hide' | 'show';

export interface Settings {
  /** Master switch: nothing is shown on Discord while off. */
  enabled: boolean;
  /** `AUTO_LANGUAGE` or a code from the supported language list. */
  language: string;
  statusText: StatusText;
  showProgress: boolean;
  showButton: boolean;
  whenPaused: WhenPaused;
  /** Drop the Latin version YouTube Music appends to titles in other scripts ("ひとひら - Hitohira"). */
  originalTitle: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  language: AUTO_LANGUAGE,
  statusText: 'app',
  showProgress: true,
  showButton: true,
  whenPaused: 'hide',
  originalTitle: true,
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

const validators: { [K in keyof Settings]: (value: unknown) => value is Settings[K] } = {
  enabled: (value): value is boolean => typeof value === 'boolean',
  language: (value): value is string =>
    value === AUTO_LANGUAGE || LANGUAGES.some((language) => language.code === value),
  statusText: (value): value is StatusText =>
    value === 'app' || value === 'title' || value === 'artist',
  showProgress: (value): value is boolean => typeof value === 'boolean',
  showButton: (value): value is boolean => typeof value === 'boolean',
  whenPaused: (value): value is WhenPaused => value === 'hide' || value === 'show',
  originalTitle: (value): value is boolean => typeof value === 'boolean',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Keeps the valid entries of a patch (e.g. from the popup) and drops everything else. */
export function validatePatch(value: unknown): Partial<Settings> {
  const patch: Record<string, unknown> = {};
  if (!isRecord(value)) return patch;

  for (const key of SETTING_KEYS) {
    if (validators[key](value[key])) patch[key] = value[key];
  }
  return patch as Partial<Settings>;
}

/** Builds the settings from whatever storage returned, using the default for each bad or missing value. */
export function parseSettings(stored: unknown): Settings {
  return { ...DEFAULT_SETTINGS, ...validatePatch(stored) };
}
