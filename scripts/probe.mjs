// Shows how YouTube Music words a track's title and artists in several interface languages, to see
// when the names differ (and so what the extension can ask for). Run it again when its behaviour
// seems to have changed:
//
//   node scripts/probe.mjs "米津玄師 Lemon" "SHONAN NO KAZE Grand Blue"   (searches, takes the first song)
//   node scripts/probe.mjs --id yGqhuP4SMaE                                (a video ID)
//
// Languages that answer the same are printed together.

const LOCALES = ['en', 'vi', 'ja', 'ko', 'zh-TW', 'ru', 'th', 'hi', 'ar'];
const SONGS_ONLY = 'EgWKAQIIAWoQEAMQBBAJEAoQBRAQEBUQEQ%3D%3D';

const context = (hl) => ({ client: { clientName: 'WEB_REMIX', clientVersion: '1.20250101.01.00', hl, gl: 'US' } });

async function post(endpoint, body) {
  const response = await fetch(`https://music.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://music.youtube.com' },
    body: JSON.stringify(body),
  });
  return response.json();
}

function firstSongId(node) {
  if (!node || typeof node !== 'object') return undefined;
  const id = node.musicResponsiveListItemRenderer?.playlistItemData?.videoId;
  if (id) return id;
  for (const child of Object.values(node)) {
    const found = firstSongId(child);
    if (found) return found;
  }
  return undefined;
}

function renderer(node, videoId) {
  if (!node || typeof node !== 'object') return undefined;
  if (node.videoId === videoId && node.longBylineText) return node;
  for (const child of Object.values(node)) {
    const found = renderer(child, videoId);
    if (found) return found;
  }
  return undefined;
}

const text = (runs) => (runs ?? []).map((run) => run.text).join('');

async function probe(videoId, label) {
  console.log(`## ${label} (${videoId})`);
  const answers = new Map();
  for (const hl of LOCALES) {
    const found = renderer(await post('next', { context: context(hl), videoId }), videoId);
    if (!found) continue;

    const [artists = '', album = ''] = text(found.longBylineText.runs).split(' • ');
    const key = `${text(found.title.runs)}  ||  ${artists}  ||  ${album}`;
    answers.set(key, [...(answers.get(key) ?? []), hl]);
  }
  for (const [answer, locales] of answers) console.log(`  ${locales.join(',').padEnd(24)} ${answer}`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/probe.mjs "<search>" ...   or   node scripts/probe.mjs --id <videoId> ...');
  process.exit(1);
}

for (let index = 0; index < args.length; index++) {
  if (args[index] === '--id') {
    const id = args[++index];
    if (id) await probe(id, 'video');
    continue;
  }
  const query = args[index];
  const id = firstSongId(await post('search', { context: context('en'), query, params: SONGS_ONLY }));
  if (id) await probe(id, query);
  else console.log(`## ${query}: no song found`);
}
