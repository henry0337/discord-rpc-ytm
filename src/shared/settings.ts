import { LANGUAGES } from './i18n.ts';

/** The language setting meaning "follow the browser's UI language". */
export const AUTO_LANGUAGE = 'auto';

export interface Settings {
  /** Master switch: nothing is shown on Discord while off. */
  enabled: boolean;
  /** `AUTO_LANGUAGE` or a code from the supported language list. */
  language: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  language: AUTO_LANGUAGE,
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

const validators: { [K in keyof Settings]: (value: unknown) => value is Settings[K] } = {
  enabled: (value): value is boolean => typeof value === 'boolean',
  language: (value): value is string =>
    value === AUTO_LANGUAGE || LANGUAGES.some((language) => language.code === value),
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
