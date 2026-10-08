import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originalTitle } from './originalTitle.ts';

test('originalTitle drops the Latin version YouTube Music appends to a Japanese title', () => {
  assert.equal(originalTitle('ひとひら - Hitohira'), 'ひとひら');
});

test('originalTitle works for other scripts too', () => {
  const cases: [string, string][] = [
    ['사랑 - Sarang', '사랑'],
    ['月亮代表我的心 - Yue Liang Dai Biao Wo De Xin', '月亮代表我的心'],
    ['Катюша - Katyusha', 'Катюша'],
    ['กาลครั้งหนึ่ง - Kan Lang Khrang Nueng', 'กาลครั้งหนึ่ง'],
    ['नमस्ते - Namaste', 'नमस्ते'],
    ['مرحبا - Marhaba', 'مرحبا'],
  ];

  for (const [input, expected] of cases) {
    assert.equal(originalTitle(input), expected, input);
  }
});

test('originalTitle keeps a trailing version note in brackets', () => {
  assert.equal(originalTitle('ひとひら - Hitohira (Remastered 2024)'), 'ひとひら (Remastered 2024)');
  assert.equal(originalTitle('ひとひら - Hitohira [Live]'), 'ひとひら [Live]');
});

test('originalTitle leaves a version label alone, since it is not a Latin version of the name', () => {
  for (const title of [
    '夜に駆ける - Instrumental',
    '千本桜 - Live',
    '紅蓮華 - TV Size',
    'ひとひら - Hitohira Remix',
    '芽ぶき - Acoustic Version',
    '残響散歌 - Off Vocal',
  ]) {
    assert.equal(originalTitle(title), title, title);
  }
});

test('originalTitle only removes the Latin part and keeps later segments', () => {
  assert.equal(originalTitle('ひとひら - Hitohira - Live'), 'ひとひら - Live');
});

test('originalTitle leaves titles without a non-Latin original alone', () => {
  for (const title of [
    'Miss You (Sped Up)',
    'Rain - Motohiro Hata',
    'Hello - Adele',
    '1 - One',
    'ひとひら',
    '',
  ]) {
    assert.equal(originalTitle(title), title, JSON.stringify(title));
  }
});

test('originalTitle leaves a title whose second part is not Latin', () => {
  assert.equal(originalTitle('夜に駆ける - 歌ってみた'), '夜に駆ける - 歌ってみた');
});

test('originalTitle needs the spaced separator YouTube Music uses', () => {
  assert.equal(originalTitle('ひとひら-Hitohira'), 'ひとひら-Hitohira');
});

test('originalTitle keeps Latin letters that are part of the original name', () => {
  assert.equal(originalTitle('Re:ゼロ - Re:Zero'), 'Re:ゼロ');
});

test('originalTitle trims the result', () => {
  assert.equal(originalTitle('  ひとひら  -  Hitohira  '), 'ひとひら');
});
