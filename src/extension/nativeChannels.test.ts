import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmedChannels,
  parseChannelList,
  parseLearned,
  parseNativeChannels,
  recordChannel,
  type NativeChannels,
} from './nativeChannels.ts';

const A = 'UCsnbD6MlVYz-TYLwQlDDVoQ';
const B = 'UCseamo0123456789abcdefg';

test('recordChannel trusts an artist only after two different tracks', () => {
  const once = recordChannel({}, A, 'aaaaaaaaaaa', 1);
  assert.deepEqual(confirmedChannels(once), []);

  const twice = recordChannel(once, A, 'bbbbbbbbbbb', 2);
  assert.deepEqual(confirmedChannels(twice), [A]);
});

test('recordChannel counts a track once, however often it is seen', () => {
  const once = recordChannel({}, A, 'aaaaaaaaaaa', 1);

  assert.equal(recordChannel(once, A, 'aaaaaaaaaaa', 2), once);
  assert.deepEqual(confirmedChannels(recordChannel(once, A, 'aaaaaaaaaaa', 2)), []);
});

test('recordChannel returns the same object when an artist is already trusted', () => {
  const trusted = recordChannel(recordChannel({}, A, 'aaaaaaaaaaa', 1), A, 'bbbbbbbbbbb', 2);

  assert.equal(recordChannel(trusted, A, 'ccccccccccc', 3), trusted);
});

test('recordChannel keeps artists apart', () => {
  const channels = recordChannel(recordChannel({}, A, 'aaaaaaaaaaa', 1), B, 'bbbbbbbbbbb', 2);

  assert.deepEqual(confirmedChannels(channels), [], 'one track each');
});

test('recordChannel forgets the oldest artists beyond its limit', () => {
  let channels: NativeChannels = {};
  for (let index = 0; index < 501; index++) {
    const channelId = `UC${String(index).padStart(22, '0')}`;
    channels = recordChannel(channels, channelId, 'aaaaaaaaaaa', index);
  }

  assert.equal(Object.keys(channels).length, 500);
  assert.equal(channels[`UC${'0'.repeat(22)}`], undefined, 'the oldest is gone');
  assert.ok(channels[`UC${String(500).padStart(22, '0')}`]);
});

test('parseNativeChannels keeps what is valid and drops the rest', () => {
  const stored = {
    [A]: { videos: ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'], seenAt: 5 },
    [B]: { videos: ['not an id', 7], seenAt: 5 },
    notAChannel: { videos: ['aaaaaaaaaaa'], seenAt: 5 },
    UCdddddddddddddddddddddd: { videos: ['aaaaaaaaaaa'], seenAt: 'yesterday' },
    UCeeeeeeeeeeeeeeeeeeeeee: 'junk',
  };

  assert.deepEqual(parseNativeChannels(stored), { [A]: { videos: ['aaaaaaaaaaa', 'bbbbbbbbbbb'], seenAt: 5 } });
  for (const junk of [null, undefined, 'x', 3, [], [[A]]]) assert.deepEqual(parseNativeChannels(junk), {}, String(junk));
});

test('parseLearned reads channel and video pairs, and nothing else', () => {
  const attribute = JSON.stringify([[A, 'aaaaaaaaaaa'], [B], ['x', 'aaaaaaaaaaa'], [A, 'short'], [A, 3], 'junk']);

  assert.deepEqual(parseLearned(attribute), [[A, 'aaaaaaaaaaa']]);
  for (const junk of [null, '', 'not json', '{}', '3']) assert.deepEqual(parseLearned(junk), [], String(junk));
});

test('parseChannelList is null until the content script has answered, then holds only channel IDs', () => {
  assert.equal(parseChannelList(null), null);
  assert.deepEqual([...(parseChannelList(JSON.stringify([A, 'nope', 4])) ?? [])], [A]);
  assert.deepEqual([...(parseChannelList('[]') ?? [])], []);
  assert.deepEqual([...(parseChannelList('not json') ?? [])], []);
});
