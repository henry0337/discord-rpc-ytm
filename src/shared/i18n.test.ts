import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, playButtonLabel, resolveLanguage } from './i18n.ts';

// Discord rejects button labels longer than 32 characters.
const MAX_LABEL_LENGTH = 32;

test('every language has a native name and a non-empty label within the Discord limit', () => {
  for (const { code, name, playButton } of LANGUAGES) {
    assert.ok(name.length > 0, `${code} name`);
    assert.ok(playButton.length > 0, `${code} label`);
    assert.ok([...playButton].length <= MAX_LABEL_LENGTH, `${code} label too long: ${playButton}`);
  }
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
  assert.equal(playButtonLabel('en'), 'Play on YouTube Music (Web)');
});

test('resolveLanguage matches an exact supported code', () => {
  assert.equal(resolveLanguage('vi'), 'vi');
  assert.equal(resolveLanguage('zh-TW'), 'zh-TW');
  assert.equal(resolveLanguage('pt-BR'), 'pt-BR');
});

test('resolveLanguage falls back from a regional variant to its language', () => {
  assert.equal(resolveLanguage('vi-VN'), 'vi');
  assert.equal(resolveLanguage('en-GB'), 'en');
  assert.equal(resolveLanguage('fr-CA'), 'fr');
  assert.equal(resolveLanguage('es-419'), 'es');
});

test('resolveLanguage separates Simplified and Traditional Chinese', () => {
  for (const locale of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-CN']) {
    assert.equal(resolveLanguage(locale), 'zh-CN', locale);
  }
  for (const locale of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW']) {
    assert.equal(resolveLanguage(locale), 'zh-TW', locale);
  }
});

test('resolveLanguage maps any Portuguese to Brazilian Portuguese', () => {
  assert.equal(resolveLanguage('pt'), 'pt-BR');
  assert.equal(resolveLanguage('pt-PT'), 'pt-BR');
});

test('resolveLanguage tolerates underscores and letter case', () => {
  assert.equal(resolveLanguage('pt_BR'), 'pt-BR');
  assert.equal(resolveLanguage('VI'), 'vi');
  assert.equal(resolveLanguage('zh_tw'), 'zh-TW');
});

test('resolveLanguage falls back to English for unknown or empty input', () => {
  assert.equal(resolveLanguage('xx'), 'en');
  assert.equal(resolveLanguage(''), 'en');
  assert.equal(resolveLanguage('not a locale!'), 'en');
});

test('playButtonLabel localises through resolveLanguage', () => {
  assert.equal(playButtonLabel('vi-VN'), playButtonLabel('vi'));
  assert.notEqual(playButtonLabel('vi'), playButtonLabel('en'));
});
