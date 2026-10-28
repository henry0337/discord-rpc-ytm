import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Locale } from 'discord-api-types/v10';
import { LANGUAGES, playButtonLabel, playbackLabel, repositoryButtonLabel, resolveLanguage } from './i18n.ts';

// Discord rejects button labels longer than 32 characters.
const MAX_LABEL_LENGTH = 32;

test('every language has a native name and a non-empty label within the Discord limit', () => {
  for (const { code, name, playButton } of LANGUAGES) {
    assert.ok(name.length > 0, `${code} name`);
    assert.ok(playButton.length > 0, `${code} label`);
    assert.ok([...playButton].length <= MAX_LABEL_LENGTH, `${code} label too long: ${playButton}`);
  }
});

test('every language words both playback states, differently', () => {
  for (const { code, playing, paused } of LANGUAGES) {
    assert.ok(playing.length > 0 && paused.length > 0, code);
    assert.notEqual(playing, paused, code);
  }
});

test('playbackLabel follows the language, falling back to English', () => {
  assert.equal(playbackLabel('vi-VN', false), 'Đang phát');
  assert.equal(playbackLabel('vi', true), 'Tạm dừng');
  assert.equal(playbackLabel('xx', true), 'Paused');
});

test('every label mentions YouTube Music', () => {
  for (const { code, playButton } of LANGUAGES) {
    assert.ok(playButton.includes('YouTube Music'), code);
  }
});

test('language codes are unique', () => {
  const codes = LANGUAGES.map((language) => language.code);

  assert.equal(new Set(codes).size, codes.length);
});

test('the English label is the reference wording', () => {
  assert.equal(playButtonLabel('en'), 'Play on YouTube Music');
});

test('resolveLanguage matches an exact supported code', () => {
  assert.equal(resolveLanguage('vi'), 'vi');
  assert.equal(resolveLanguage('zh-TW'), 'zh-TW');
  assert.equal(resolveLanguage('ja'), 'ja');
});

test('resolveLanguage falls back from a regional variant to its language', () => {
  assert.equal(resolveLanguage('vi-VN'), 'vi');
  assert.equal(resolveLanguage('en-GB'), 'en');
  assert.equal(resolveLanguage('ja-JP'), 'ja');
  assert.equal(resolveLanguage('ko-KR'), 'ko');
});

test('resolveLanguage separates Simplified and Traditional Chinese', () => {
  for (const locale of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-CN']) {
    assert.equal(resolveLanguage(locale), 'zh-CN', locale);
  }
  for (const locale of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW']) {
    assert.equal(resolveLanguage(locale), 'zh-TW', locale);
  }
});

test('resolveLanguage sends a language that has no label to English', () => {
  for (const locale of ['fr', 'fr-CA', 'es-419', 'pt', 'pt-BR', 'de', 'ru', 'th']) {
    assert.equal(resolveLanguage(locale), 'en', locale);
  }
});

test('resolveLanguage tolerates underscores and letter case', () => {
  assert.equal(resolveLanguage('vi_VN'), 'vi');
  assert.equal(resolveLanguage('VI'), 'vi');
  assert.equal(resolveLanguage('zh_tw'), 'zh-TW');
});

test('resolveLanguage falls back to English for unknown or empty input', () => {
  assert.equal(resolveLanguage('xx'), 'en');
  assert.equal(resolveLanguage(''), 'en');
  assert.equal(resolveLanguage('not a locale!'), 'en');
});

test('every language words the repository button within the length Discord allows', () => {
  for (const { code, repository } of LANGUAGES) {
    assert.ok(repository.includes('GitHub'), `${code} names GitHub`);
    assert.ok([...repository].length <= MAX_LABEL_LENGTH, `${code} label too long: ${repository}`);
  }
});

test('repositoryButtonLabel localises through resolveLanguage', () => {
  assert.equal(repositoryButtonLabel('en'), 'GitHub Repository');
  assert.equal(repositoryButtonLabel('vi-VN'), 'Kho mã nguồn GitHub');
  assert.equal(repositoryButtonLabel('xx'), 'GitHub Repository');
});

test('playButtonLabel localises through resolveLanguage', () => {
  assert.equal(playButtonLabel('vi-VN'), playButtonLabel('vi'));
  assert.notEqual(playButtonLabel('vi'), playButtonLabel('en'));
});

const DISCORD_LOCALES: string[] = Object.values(Locale);
const baseLanguage = (code: string): string => code.split('-')[0]!;

test('every language corresponds to a locale Discord supports', () => {
  for (const { code } of LANGUAGES) {
    assert.ok(
      DISCORD_LOCALES.some((locale) => locale === code || baseLanguage(locale) === code),
      `${code} is not a Discord locale`,
    );
  }
});

test('a Discord locale resolves to its own language when there is a label for it, else to English', () => {
  const supported = new Set(LANGUAGES.map((language) => baseLanguage(language.code)));

  for (const locale of DISCORD_LOCALES) {
    const expected = supported.has(baseLanguage(locale)) ? baseLanguage(locale) : 'en';
    assert.equal(baseLanguage(resolveLanguage(locale)), expected, locale);
  }
});
