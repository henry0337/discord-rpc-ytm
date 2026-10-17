import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, SETTING_KEYS, parseSettings, validatePatch } from './settings.ts';

test('parseSettings returns the defaults when nothing is stored', () => {
  assert.deepEqual(parseSettings({}), DEFAULT_SETTINGS);
});

test('the defaults match the previous behaviour of the extension', () => {
  assert.deepEqual(DEFAULT_SETTINGS, {
    enabled: true,
    language: 'auto',
    whenPaused: 'hide',
  });
});

test('parseSettings keeps valid stored values', () => {
  const stored = {
    enabled: false,
    language: 'vi',
    whenPaused: 'show',
  };

  assert.deepEqual(parseSettings(stored), stored);
});

test('parseSettings falls back to the default for each invalid value separately', () => {
  const settings = parseSettings({
    enabled: 'yes',
    language: 'klingon',
    whenPaused: 'later',
  });

  assert.deepEqual(settings, DEFAULT_SETTINGS);
  assert.equal(parseSettings({ enabled: false, language: 'klingon' }).enabled, false);
});

test('parseSettings ignores keys it does not know, such as settings that no longer exist', () => {
  assert.deepEqual(parseSettings({ somethingElse: 1, statusText: 'title', showButton: false }), DEFAULT_SETTINGS);
});

test('SETTING_KEYS lists every setting so storage can be read in one call', () => {
  assert.deepEqual([...SETTING_KEYS].sort(), Object.keys(DEFAULT_SETTINGS).sort());
});

test('validatePatch keeps only known keys with valid values', () => {
  const patch = validatePatch({
    enabled: false,
    whenPaused: 'show',
    language: 'klingon',
    unknown: true,
  });

  assert.deepEqual(patch, { enabled: false, whenPaused: 'show' });
});

test('validatePatch returns an empty patch for input that is not an object', () => {
  for (const value of [null, undefined, 5, 'x', []]) {
    assert.deepEqual(validatePatch(value), {}, String(value));
  }
});
