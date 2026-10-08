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
    statusText: 'app',
    showProgress: true,
    showButton: true,
    whenPaused: 'hide',
    originalTitle: true,
  });
});

test('parseSettings keeps valid stored values', () => {
  const stored = {
    enabled: false,
    language: 'vi',
    statusText: 'title',
    showProgress: false,
    showButton: false,
    whenPaused: 'show',
    originalTitle: false,
  };

  assert.deepEqual(parseSettings(stored), stored);
});

test('parseSettings falls back to the default for each invalid value separately', () => {
  const settings = parseSettings({
    enabled: 'yes',
    language: 'klingon',
    statusText: 'nonsense',
    showProgress: 1,
    showButton: null,
    whenPaused: 'later',
    originalTitle: 'maybe',
  });

  assert.deepEqual(settings, DEFAULT_SETTINGS);
  assert.equal(parseSettings({ enabled: false, language: 'klingon' }).enabled, false);
});

test('parseSettings ignores keys it does not know', () => {
  assert.deepEqual(parseSettings({ somethingElse: 1 }), DEFAULT_SETTINGS);
});

test('SETTING_KEYS lists every setting so storage can be read in one call', () => {
  assert.deepEqual([...SETTING_KEYS].sort(), Object.keys(DEFAULT_SETTINGS).sort());
});

test('validatePatch keeps only known keys with valid values', () => {
  const patch = validatePatch({
    showButton: false,
    statusText: 'artist',
    language: 'klingon',
    whenPaused: 5,
    unknown: true,
  });

  assert.deepEqual(patch, { showButton: false, statusText: 'artist' });
});

test('validatePatch returns an empty patch for input that is not an object', () => {
  for (const value of [null, undefined, 5, 'x', []]) {
    assert.deepEqual(validatePatch(value), {}, String(value));
  }
});
