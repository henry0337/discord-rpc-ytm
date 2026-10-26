import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  albumUrl,
  channelUrl,
  parseDetailsAttribute,
  parseTrackDetails,
  playlistUrl,
} from './trackDetails.ts';

const TRVNSPORTER = 'UCvG6SZfCwSCCjifUpGHw1EA';
const NARVENT = 'UCf0MXejn3VTMr1tvPFszwOg';
const SKVLENT = 'UC0o_DCZjxLBH1ioEX__5WAg';
const ALBUM = 'MPREb_nWA3z8K9P9T';

// Shapes copied from real responses of YouTube Music's `next` endpoint.
const text = (value: string) => ({ text: value });
const artist = (name: string, browseId: string) => ({
  text: name,
  navigationEndpoint: {
    browseEndpoint: {
      browseId,
      browseEndpointContextSupportedConfigs: {
        browseEndpointContextMusicConfig: { pageType: 'MUSIC_PAGE_TYPE_ARTIST' },
      },
    },
  },
});
const album = (name: string, browseId: string) => ({
  text: name,
  navigationEndpoint: {
    browseEndpoint: {
      browseId,
      browseEndpointContextSupportedConfigs: {
        browseEndpointContextMusicConfig: { pageType: 'MUSIC_PAGE_TYPE_ALBUM' },
      },
    },
  },
});

function response(
  videoId: string,
  runs: unknown[],
  extraQueue: unknown[] = [],
  title: unknown = { runs: [{ text: 'Song' }] },
) {
  return {
    contents: {
      tabs: [
        {
          queue: [
            { playlistPanelVideoRenderer: { videoId, title, longBylineText: { runs } } },
            ...extraQueue,
          ],
        },
      ],
    },
  };
}

const multiArtistRuns = [
  artist('TRVNSPORTER', TRVNSPORTER),
  text(', '),
  artist('Narvent', NARVENT),
  text(' và '),
  artist('SKVLENT', SKVLENT),
  text(' • '),
  album('Miss You', ALBUM),
  text(' • '),
  text('2024'),
];

test('parseTrackDetails lists every artist with its channel, whatever the localised separators', () => {
  const details = parseTrackDetails(response('vid', multiArtistRuns), 'vid');

  assert.deepEqual(details?.artists, [
    { name: 'TRVNSPORTER', channelId: TRVNSPORTER },
    { name: 'Narvent', channelId: NARVENT },
    { name: 'SKVLENT', channelId: SKVLENT },
  ]);
});

test('parseTrackDetails finds the album', () => {
  assert.equal(parseTrackDetails(response('vid', multiArtistRuns), 'vid')?.albumId, ALBUM);
});

const withLength = (length: unknown) => ({
  contents: {
    queue: [
      { playlistPanelVideoRenderer: { videoId: 'vid', longBylineText: { runs: [] }, lengthText: length } },
    ],
  },
});

test('parseTrackDetails reads the length of the track as the queue words it', () => {
  const lengths: [string, number][] = [['2:55', 175], ['0:49', 49], ['12:05', 725], ['1:02:03', 3723]];

  for (const [text, seconds] of lengths) {
    assert.equal(parseTrackDetails(withLength({ runs: [{ text }] }), 'vid')?.durationSeconds, seconds, text);
  }
});

test('parseTrackDetails has no length when the queue gives none, or one it cannot read', () => {
  for (const length of [undefined, null, {}, { runs: [] }, { runs: [{ text: '' }] }, { runs: [{ text: 'LIVE' }] }, { runs: [{ text: '0:00' }] }]) {
    assert.equal(parseTrackDetails(withLength(length), 'vid')?.durationSeconds, null, JSON.stringify(length));
  }
});

test('parseTrackDetails reads the name of the album', () => {
  assert.equal(parseTrackDetails(response('vid', multiArtistRuns), 'vid')?.albumName, 'Miss You');
});

// The queue header reads "Playing from" over the name of what is being played.
const withQueueName = (base: object, name: string) => ({
  ...base,
  header: {
    musicQueueHeaderRenderer: { title: { runs: [text('Playing from')] }, subtitle: { runs: [text(name)] } },
  },
});

test('parseTrackDetails names the playlist being played, when a person made it', () => {
  const queue = withQueueName(response('vid', multiArtistRuns), 'Late night');

  const details = parseTrackDetails(queue, 'vid', 'PLabc_123-xyz');

  assert.equal(details?.playlistName, 'Late night');
  assert.equal(details?.playlistId, 'PLabc_123-xyz');
});

test('parseTrackDetails does not name what YouTube Music generates (album, radio, liked songs) or an unknown queue', () => {
  const queue = withQueueName(response('vid', multiArtistRuns), 'Miss You');

  for (const playlistId of ['OLAK5uy_mGVoHgLCl4hwXqHaORcOZFKXb6pNyR6D4', 'RDAMVMvid', 'RDEMabc', 'LM', null]) {
    const details = parseTrackDetails(queue, 'vid', playlistId);
    assert.equal(details?.playlistName, null, String(playlistId));
    assert.equal(details?.playlistId, null, String(playlistId));
  }
  assert.equal(parseTrackDetails(queue, 'vid')?.playlistName, null);
});

test('parseTrackDetails has no playlist name when the queue carries none', () => {
  const details = parseTrackDetails(response('vid', multiArtistRuns), 'vid', 'PLabc');

  assert.equal(details?.playlistName, null);
  assert.equal(details?.playlistId, null);
});

test('parseTrackDetails keeps an artist that has no channel, without a link', () => {
  const runs = [artist('Linked', TRVNSPORTER), text(' & '), text('Unlinked'), text(' • '), text('2020')];

  assert.deepEqual(parseTrackDetails(response('vid', runs), 'vid')?.artists, [
    { name: 'Linked', channelId: TRVNSPORTER },
    { name: 'Unlinked', channelId: null },
  ]);
});

test('parseTrackDetails has no album for a video without one, and does not mistake views for artists', () => {
  const runs = [artist('Some Channel', TRVNSPORTER), text(' • '), text('1,2 Tr lượt xem'), text(' • '), text('2 năm trước')];
  const details = parseTrackDetails(response('vid', runs), 'vid');

  assert.equal(details?.albumId, null);
  assert.equal(details?.albumName, null);
  assert.deepEqual(details?.artists, [{ name: 'Some Channel', channelId: TRVNSPORTER }]);
});

test('parseTrackDetails handles a single artist', () => {
  const runs = [artist('Solo', NARVENT), text(' • '), album('Solo Album', ALBUM), text(' • '), text('2023')];

  assert.deepEqual(parseTrackDetails(response('vid', runs), 'vid')?.artists, [
    { name: 'Solo', channelId: NARVENT },
  ]);
});

test('parseTrackDetails only uses the renderer of the requested video, not the rest of the queue', () => {
  const other = {
    playlistPanelVideoRenderer: {
      videoId: 'other',
      longBylineText: { runs: [artist('Someone Else', NARVENT)] },
    },
  };
  const details = parseTrackDetails(response('vid', multiArtistRuns, [other]), 'vid');

  assert.equal(details?.artists.length, 3);
  assert.equal(parseTrackDetails(response('vid', multiArtistRuns, [other]), 'other')?.artists[0]?.name, 'Someone Else');
});

test('parseTrackDetails returns null when the response does not describe the video', () => {
  assert.equal(parseTrackDetails(response('vid', multiArtistRuns), 'missing'), null);
  assert.equal(parseTrackDetails({}, 'vid'), null);
  assert.equal(parseTrackDetails(null, 'vid'), null);
  assert.equal(parseTrackDetails('nope', 'vid'), null);
});

test('parseTrackDetails only accepts channel IDs that look like channels', () => {
  const runs = [artist('Odd', 'VLPLsomething'), text(' • '), text('2020')];

  assert.deepEqual(parseTrackDetails(response('vid', runs), 'vid')?.artists, [
    { name: 'Odd', channelId: null },
  ]);
});

test('parseTrackDetails reads the title the player bar shows, which can differ from the media session', () => {
  const title = { runs: [{ text: 'ひとひら - Hitohira' }] };

  assert.equal(parseTrackDetails(response('vid', multiArtistRuns, [], title), 'vid')?.title, 'ひとひら - Hitohira');
});

test('parseTrackDetails joins a title that comes in several runs', () => {
  const title = { runs: [{ text: 'Part one' }, { text: ' & part two' }] };

  assert.equal(parseTrackDetails(response('vid', multiArtistRuns, [], title), 'vid')?.title, 'Part one & part two');
});

test('parseTrackDetails has no title when the renderer carries none', () => {
  assert.equal(parseTrackDetails(response('vid', multiArtistRuns, [], undefined), 'vid')?.title, 'Song');
  assert.equal(parseTrackDetails(response('vid', multiArtistRuns, [], null), 'vid')?.title, null);
  assert.equal(parseTrackDetails(response('vid', multiArtistRuns, [], { runs: [] }), 'vid')?.title, null);
});

test('parseTrackDetails reads the credit YouTube Music appends to the title', () => {
  const title = { runs: [{ text: 'ピュア - Pure (feat. Eriko Hashimoto)' }] };
  const details = parseTrackDetails(response('vid', multiArtistRuns, [], title), 'vid');

  assert.deepEqual(details?.credit, { baseTitle: 'ピュア - Pure', names: ['Eriko Hashimoto'] });
  assert.equal(details?.title, 'ピュア - Pure (feat. Eriko Hashimoto)');
});

test('parseTrackDetails reads the Japanese form of the credit too', () => {
  const title = { runs: [{ text: 'ピュア（feat. 橋本絵莉子）' }] };

  assert.deepEqual(parseTrackDetails(response('vid', multiArtistRuns, [], title), 'vid')?.credit, {
    baseTitle: 'ピュア',
    names: ['橋本絵莉子'],
  });
});

test('parseTrackDetails has no credit when the title carries none', () => {
  assert.equal(parseTrackDetails(response('vid', multiArtistRuns), 'vid')?.credit, null);
});

test('playlistUrl points at the playlist page', () => {
  assert.equal(playlistUrl('PLabc_123'), 'https://music.youtube.com/playlist?list=PLabc_123');
});

test('channelUrl and albumUrl point at YouTube Music pages', () => {
  assert.equal(channelUrl(TRVNSPORTER), `https://music.youtube.com/channel/${TRVNSPORTER}`);
  assert.equal(albumUrl(ALBUM), `https://music.youtube.com/browse/${ALBUM}`);
});

test('parseDetailsAttribute round-trips well-formed details', () => {
  const details = {
    videoId: 'vid',
    title: 'ひとひら - Hitohira',
    artists: [{ name: 'A', channelId: TRVNSPORTER }, { name: 'B', channelId: null }],
    albumId: ALBUM,
    albumName: 'Miss You',
    playlistName: 'Late night',
    playlistId: 'PLabc_123',
    durationSeconds: 175,
    credit: { baseTitle: 'ピュア - Pure', names: ['Eriko Hashimoto', 'Someone'] },
  };

  assert.deepEqual(parseDetailsAttribute(JSON.stringify(details)), details);
});

test('parseDetailsAttribute rejects missing, malformed or wrongly shaped input', () => {
  const bad = [null, '', 'not json', '42', '[]', '{}', JSON.stringify({ videoId: 5, artists: [], albumId: null })];

  for (const raw of bad) {
    assert.equal(parseDetailsAttribute(raw), null, String(raw));
  }
});

test('parseDetailsAttribute drops IDs that do not look like channel or album IDs, and nameless artists', () => {
  const raw = JSON.stringify({
    videoId: 'vid',
    artists: [{ name: 'A', channelId: 'javascript:1' }, { name: '', channelId: TRVNSPORTER }],
    albumId: '../../evil',
  });

  assert.deepEqual(parseDetailsAttribute(raw), {
    videoId: 'vid',
    title: null,
    artists: [{ name: 'A', channelId: null }],
    albumId: null,
    albumName: null,
    playlistName: null,
    playlistId: null,
    durationSeconds: null,
    credit: null,
  });
});

test('parseDetailsAttribute only keeps a length that is a positive number', () => {
  const base = { videoId: 'vid', title: null, artists: [], albumId: null };

  for (const bad of [0, -5, '175', null, {}]) {
    assert.equal(parseDetailsAttribute(JSON.stringify({ ...base, durationSeconds: bad }))?.durationSeconds, null, String(bad));
  }
  assert.equal(parseDetailsAttribute(JSON.stringify({ ...base, durationSeconds: 175 }))?.durationSeconds, 175);
});

test('parseDetailsAttribute only keeps a playlist ID that looks like a playlist a person made', () => {
  const base = { videoId: 'vid', title: null, artists: [], albumId: null };

  for (const bad of ['../../evil', 'javascript:1', 'RDAMVMabc', 'OLAK5uy_x', 'LM', '', 5, null]) {
    assert.equal(parseDetailsAttribute(JSON.stringify({ ...base, playlistId: bad }))?.playlistId, null, String(bad));
  }
  assert.equal(parseDetailsAttribute(JSON.stringify({ ...base, playlistId: 'PLabc_123-x' }))?.playlistId, 'PLabc_123-x');
});

test('parseDetailsAttribute trims the album and playlist names and drops anything that is not a name', () => {
  const base = { videoId: 'vid', title: null, artists: [], albumId: null };

  const named = parseDetailsAttribute(JSON.stringify({ ...base, albumName: ' Miss You ', playlistName: 'Late night' }));
  assert.equal(named?.albumName, 'Miss You');
  assert.equal(named?.playlistName, 'Late night');

  for (const bad of ['', '   ', 5, null, {}]) {
    const details = parseDetailsAttribute(JSON.stringify({ ...base, albumName: bad, playlistName: bad }));
    assert.equal(details?.albumName, null, JSON.stringify(bad));
    assert.equal(details?.playlistName, null, JSON.stringify(bad));
  }
});

test('parseDetailsAttribute drops a credit that is malformed or empty', () => {
  const base = { videoId: 'vid', title: null, artists: [], albumId: null };
  const bad = [
    'credit',
    { baseTitle: '', names: ['A'] },
    { baseTitle: 'T', names: [] },
    { baseTitle: 'T', names: [5, ''] },
    { baseTitle: 5, names: ['A'] },
  ];

  for (const credit of bad) {
    assert.equal(parseDetailsAttribute(JSON.stringify({ ...base, credit }))?.credit, null, JSON.stringify(credit));
  }
});

test('parseDetailsAttribute keeps the valid names of a credit and drops the rest', () => {
  const raw = JSON.stringify({
    videoId: 'vid',
    title: null,
    artists: [],
    albumId: null,
    credit: { baseTitle: 'ピュア', names: ['Eriko Hashimoto', 7, '', '  '] },
  });

  assert.deepEqual(parseDetailsAttribute(raw)?.credit, { baseTitle: 'ピュア', names: ['Eriko Hashimoto'] });
});

test('parseDetailsAttribute accepts details from before credits existed', () => {
  const raw = JSON.stringify({ videoId: 'vid', title: null, artists: [], albumId: null });

  assert.equal(parseDetailsAttribute(raw)?.credit, null);
});
