import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCredit } from './credit.ts';
import { channelToLearn, hasKana, useNative, wantsNative } from './nativeNames.ts';
import type { TrackDetails } from './trackDetails.ts';

const SHONAN = 'UCsnbD6MlVYz-TYLwQlDDVoQ';
const SEAMO = 'UCseamo0123456789abcdefg';
const MAYN = 'UCmayn00123456789abcdefg';
const SWIFT = 'UCswift0123456789abcdefg';
const NONE = new Set<string>();

// Values copied from real responses of YouTube Music's `next` endpoint, in English and in Japanese.
const base: TrackDetails = {
  videoId: 'znI3ld4OJco',
  title: null,
  artists: [],
  albumId: null,
  albumName: null,
  playlistName: null,
  playlistId: null,
  durationSeconds: 239,
  credit: null,
};

function details(overrides: Partial<TrackDetails>): TrackDetails {
  const merged = { ...base, ...overrides };
  return { ...merged, credit: merged.credit ?? (merged.title ? parseCredit(merged.title) : null) };
}

const hadakaEnglish = details({
  title: "裸でどつきあい - Hadaka de Dotsukiai feat. May'n (feat. May'n)",
  artists: [
    { name: 'SEAMO', channelId: SEAMO },
    { name: "May'n", channelId: MAYN },
  ],
  albumId: 'MPREb_aaaaaaaaaaa',
  albumName: "Hadaka de Dotsukiai feat. May'n",
});
const hadakaJapanese = details({
  title: "裸でどつきあい（feat. May'n）",
  artists: [
    { name: 'SEAMO', channelId: SEAMO },
    { name: "May'n", channelId: MAYN },
  ],
  albumId: 'MPREb_aaaaaaaaaaa',
  albumName: "裸でどつきあい feat. May'n",
});

test('hasKana is true for hiragana and katakana, and false for Han characters alone, Hangul and Latin', () => {
  for (const text of ['ひとひら', '水樹カヤ', 'ヒカル', 'Natsuko 夏子 ね']) assert.equal(hasKana(text), true, text);
  for (const text of ['夏子', '月亮代表我的心', '밤편지', 'Lemon', '']) assert.equal(hasKana(text), false, text);
});

test('wantsNative is true for a Japanese title, even from an artist nobody has seen before', () => {
  assert.equal(wantsNative(hadakaEnglish, NONE), true);
});

test('wantsNative is false for a title in Latin letters, unless the first artist was seen on Japanese titles', () => {
  const grandBlue = details({ title: 'Grand Blue', artists: [{ name: 'SHONAN NO KAZE', channelId: SHONAN }] });

  assert.equal(wantsNative(grandBlue, NONE), false);
  assert.equal(wantsNative(grandBlue, new Set([SHONAN])), true);
  assert.equal(wantsNative(grandBlue, new Set([SEAMO])), false);
});

test('wantsNative leaves Western artists alone, which would be transliterated into katakana', () => {
  const shakeItOff = details({ title: 'Shake It Off', artists: [{ name: 'Taylor Swift', channelId: SWIFT }] });

  assert.equal(wantsNative(shakeItOff, new Set([SHONAN])), false);
});

test('wantsNative is false for a title in Han characters alone, which may be Chinese', () => {
  const natsuko = details({ title: '夏子 - Natsuko', artists: [{ name: 'Funky Monkey Bλby\'s', channelId: SHONAN }] });

  assert.equal(wantsNative(natsuko, NONE), false);
  assert.equal(wantsNative(natsuko, new Set([SHONAN])), true);
});

test('channelToLearn names the first artist only when the title is Japanese', () => {
  assert.equal(channelToLearn(hadakaEnglish), SEAMO);
  assert.equal(channelToLearn(details({ title: 'Grand Blue', artists: [{ name: 'X', channelId: SHONAN }] })), null);
  assert.equal(channelToLearn(details({ title: 'ひとひら', artists: [{ name: 'X', channelId: null }] })), null);
  assert.equal(channelToLearn(details({ title: 'ひとひら', artists: [] })), null);
});

test('useNative takes the title, the artists, the album and the credit from the Japanese response', () => {
  const merged = useNative(hadakaEnglish, hadakaJapanese);

  assert.equal(merged?.title, "裸でどつきあい（feat. May'n）");
  assert.equal(merged?.albumName, "裸でどつきあい feat. May'n");
  assert.deepEqual(merged?.credit, { baseTitle: '裸でどつきあい', names: ["May'n"] });
  assert.deepEqual(merged?.artists.map((artist) => artist.channelId), [SEAMO, MAYN]);
  assert.equal(merged?.durationSeconds, 239, 'what is not a name stays');
});

test('useNative shows the Japanese names of the artists', () => {
  const english = details({ title: 'Grand Blue', artists: [{ name: 'SHONAN NO KAZE', channelId: SHONAN }] });
  const japanese = details({ title: 'Grand Blue', artists: [{ name: '湘南乃風', channelId: SHONAN }] });

  assert.deepEqual(useNative(english, japanese)?.artists, [{ name: '湘南乃風', channelId: SHONAN }]);
});

test('useNative keeps the album name when the Japanese response is about another album', () => {
  const other = { ...hadakaJapanese, albumId: 'MPREb_bbbbbbbbbbb', albumName: 'Another' };

  assert.equal(useNative(hadakaEnglish, other)?.albumName, "Hadaka de Dotsukiai feat. May'n");
});

test('useNative drops the credit that belonged to the title it replaces', () => {
  assert.ok(hadakaEnglish.credit);
  assert.equal(useNative(hadakaEnglish, { ...hadakaJapanese, title: '裸でどつきあい', credit: null })?.credit, null);
});

test('useNative refuses a response that is not about the same track and artists', () => {
  const refused: Partial<TrackDetails>[] = [
    { videoId: 'otherVideo1' },
    { title: null },
    { artists: [{ name: 'SEAMO', channelId: SEAMO }] },
    { artists: [{ name: 'SEAMO', channelId: SEAMO }, { name: 'Someone', channelId: SWIFT }] },
    { artists: [] },
  ];

  for (const overrides of refused) {
    assert.equal(useNative(hadakaEnglish, { ...hadakaJapanese, ...overrides }), null, JSON.stringify(overrides));
  }
});

test('useNative has nothing to change for a track without artists', () => {
  const lone = details({ title: 'ひとひら', artists: [] });

  assert.equal(useNative(lone, lone), null);
});
