import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mayCarryCredit, parseCredit } from './credit.ts';

test('parseCredit splits the English credit YouTube Music appends from the rest of the title', () => {
  assert.deepEqual(parseCredit('ピュア - Pure (feat. Eriko Hashimoto)'), {
    baseTitle: 'ピュア - Pure',
    names: ['Eriko Hashimoto'],
  });
});

test('parseCredit reads the Japanese form, with full-width brackets and the name as shown', () => {
  assert.deepEqual(parseCredit('ピュア（feat. 橋本絵莉子）'), { baseTitle: 'ピュア', names: ['橋本絵莉子'] });
});

test('parseCredit lists every name of a credit joined by commas and a final ampersand', () => {
  assert.deepEqual(
    parseCredit('ありふれた世界の果てに - FOR OKINAWA (feat. Awich, CHICO CARLITO, ONE OK ROCK & Paledusk)')?.names,
    ['Awich', 'CHICO CARLITO', 'ONE OK ROCK', 'Paledusk'],
  );
  assert.deepEqual(parseCredit('HipHop - Seoul (feat. Chino XL, Masta Wu & Teddy)'.replace('HipHop', 'ヒップホップ'))?.names, [
    'Chino XL',
    'Masta Wu',
    'Teddy',
  ]);
  assert.deepEqual(parseCredit('夜を越えて - Yoru Wo Koete (feat. Tiger JK & Jung In)')?.names, ['Tiger JK', 'Jung In']);
});

test('parseCredit also splits names on the Japanese comma', () => {
  assert.deepEqual(parseCredit('夜（feat. 初音ミク、重音テト）')?.names, ['初音ミク', '重音テト']);
});

test('parseCredit trims names and accepts any letter case of feat.', () => {
  assert.deepEqual(parseCredit('에잇 (Feat. SUGA )'), { baseTitle: '에잇', names: ['SUGA'] });
});

test('parseCredit keeps earlier brackets as part of the title', () => {
  assert.deepEqual(parseCredit('ひとひら - Hitohira (Remastered) (feat. Someone)'), {
    baseTitle: 'ひとひら - Hitohira (Remastered)',
    names: ['Someone'],
  });
});

test('parseCredit leaves Latin-only titles alone, which are not the case this handles', () => {
  for (const title of ['Starboy (feat. Daft Punk)', 'BET (feat. Shorty Juugin) (feat. Shorty Juugin)']) {
    assert.equal(parseCredit(title), null, title);
  }
});

test('parseCredit only reads a credit at the very end of the title', () => {
  assert.equal(parseCredit('夜 (feat. X) - Night'), null);
  assert.equal(parseCredit('夜 feat. X'), null);
});

test('parseCredit ignores other brackets and other wording', () => {
  for (const title of [
    'ピュア - Pure (cùng với Eriko Hashimoto)',
    'ひとひら - Hitohira (Remastered)',
    'ひとひら - Hitohira',
    'ダイダイ (Daidai ft.HatsuneMiku)',
  ]) {
    assert.equal(parseCredit(title), null, title);
  }
});

test('parseCredit ignores a credit without names or without a title in front of it', () => {
  assert.equal(parseCredit('夜 (feat. )'), null);
  assert.equal(parseCredit('(feat. 橋本絵莉子)'), null);
});

test('mayCarryCredit is true for a non-Latin title that ends in a closing bracket', () => {
  assert.equal(mayCarryCredit('ピュア - Pure (cùng với Eriko Hashimoto)'), true);
  assert.equal(mayCarryCredit('ピュア（feat. 橋本絵莉子）'), true);
  assert.equal(mayCarryCredit('„ピュア - Pure“ (su Eriko Hashimoto)'), true);
  assert.equal(mayCarryCredit('ピュア - Pure همراه هنرمند ویژه Eriko Hashimoto)'), true);
});

test('mayCarryCredit is false when no credit can be there', () => {
  assert.equal(mayCarryCredit('ひとひら - Hitohira'), false);
  assert.equal(mayCarryCredit('Starboy (feat. Daft Punk)'), false);
  assert.equal(mayCarryCredit(''), false);
});
