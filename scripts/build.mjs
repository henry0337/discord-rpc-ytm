// Builds the host (dist/host) and one unpacked extension per browser family (dist/chrome, dist/firefox).
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { GECKO_EXTENSION_ID } from '../src/shared/protocol.ts';

const root = new URL('../', import.meta.url);
const path = (relative) => new URL(relative, root).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const { version } = JSON.parse(readFileSync(path('package.json'), 'utf8'));

// dist/host is deliberately left alone: it also holds the launcher and native manifests that the
// browsers' registry entries point at, and a running host keeps that directory locked on Windows.
for (const browser of ['chrome', 'firefox']) {
  rmSync(path(`dist/${browser}`), { recursive: true, force: true });
}

await build({
  entryPoints: [path('src/host/index.ts')],
  outfile: path('dist/host/host.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  define: { __VERSION__: JSON.stringify(version) },
  logLevel: 'info',
});

const baseManifest = JSON.parse(readFileSync(path('src/extension/manifest.base.json'), 'utf8'));
const manifests = {
  chrome: { ...baseManifest, background: { service_worker: 'background.js' } },
  firefox: (() => {
    // Firefox warns about the Chromium-only `key` and `minimum_chrome_version`.
    const { key: _key, minimum_chrome_version: _min, ...rest } = baseManifest;
    return {
      ...rest,
      background: { scripts: ['background.js'] },
      browser_specific_settings: {
        gecko: {
          id: GECKO_EXTENSION_ID,
          strict_min_version: '140.0',
          data_collection_permissions: { required: ['none'] },
        },
      },
    };
  })(),
};

for (const [browser, manifest] of Object.entries(manifests)) {
  const outdir = path(`dist/${browser}`);
  await build({
    entryPoints: ['page', 'content', 'background', 'popup'].map((name) => path(`src/extension/${name}.ts`)),
    outdir,
    bundle: true,
    format: 'iife',
    target: browser === 'chrome' ? 'chrome110' : 'firefox140',
    logLevel: 'info',
  });
  mkdirSync(outdir, { recursive: true });
  copyFileSync(path('src/extension/popup.html'), `${outdir}/popup.html`);
  copyFileSync(path('src/extension/popup.css'), `${outdir}/popup.css`);
  writeFileSync(`${outdir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
}
