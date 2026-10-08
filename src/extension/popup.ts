import { LANGUAGES } from '../shared/i18n.ts';
import type { Track } from '../shared/protocol.ts';
import { AUTO_LANGUAGE, type Settings, type StatusText } from '../shared/settings.ts';
import { ext } from './api.ts';
import { formatDiagnostics } from './diagnostics.ts';
import { buildPopupModel, progressOf, type Banner, type Card, type Pill } from './popupModel.ts';
import type { PopupMessage, Status } from './status.ts';

const REFRESH_MS = 1500;
const PROGRESS_TICK_MS = 1000;
const COPIED_RESET_MS = 2000;

function byId<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const master = byId<HTMLButtonElement>('master');
const masterText = byId('masterText');
const statusSeg = byId('statusSeg');
const progressSwitch = byId<HTMLButtonElement>('progressSwitch');
const buttonSwitch = byId<HTMLButtonElement>('buttonSwitch');
const originalTitleSwitch = byId<HTMLButtonElement>('originalTitleSwitch');
const langRow = byId('langRow');
const langNote = byId('langNote');
const langSelect = byId<HTMLSelectElement>('lang');
const pausedSelect = byId<HTMLSelectElement>('paused');
const copyDiagnostics = byId<HTMLButtonElement>('copyDiag');

let latest: Status | undefined;
let lastRendered = '';
let progressTrack: Track | null = null;
let progressFill: HTMLElement | null = null;
let progressElapsed: HTMLElement | null = null;

// --- small DOM helpers ------------------------------------------------------------------------

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(href: string, className: string, text: string): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.className = className;
  anchor.textContent = text;
  return anchor;
}

async function copyText(text: string, button: HTMLButtonElement, idleLabel: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Copy failed';
  }
  setTimeout(() => (button.textContent = idleLabel), COPIED_RESET_MS);
}

// --- rendering --------------------------------------------------------------------------------

function pill(name: string, { tone, text }: Pill): HTMLElement {
  const node = element('span', `pill ${tone}`);
  node.append(element('i'), `${name} · ${text}`);
  return node;
}

function renderBanner(banner: Banner | null): void {
  const container = byId('banner');
  if (!banner) return container.replaceChildren();

  const box = element('div', `banner ${banner.tone}`);
  const message = element('div');
  message.append(element('strong', undefined, banner.title), ` ${banner.body}`);
  box.append(message);
  if (banner.detail) box.append(element('div', 'detail', banner.detail));
  if (banner.command) {
    const command = banner.command;
    const row = element('div', 'code');
    const copy = element('button', 'btn', 'Copy') as HTMLButtonElement;
    copy.addEventListener('click', () => void copyText(command, copy, 'Copy'));
    row.append(element('span', undefined, command), copy);
    box.append(row);
  }
  container.replaceChildren(box);
}

function renderCard(card: Card, note: string, now: Track): HTMLElement[] {
  const cover = element('div', 'cover');
  if (card.artworkUrl) {
    const image = document.createElement('img');
    image.src = card.artworkUrl;
    image.alt = '';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.remove());
    cover.append(image);
  }

  const meta = element('div', 'meta');
  meta.append(element('div', 'song', card.title));
  meta.append(
    card.artistUrl ? link(card.artistUrl, 'artist', card.artist) : element('span', 'artist', card.artist),
  );
  progressTrack = null;
  progressFill = null;
  progressElapsed = null;
  if (card.progress) {
    const bar = element('div', 'track');
    progressFill = element('i');
    bar.append(progressFill);
    progressElapsed = element('span');
    const row = element('div', 'progress');
    row.append(progressElapsed, bar, element('span', undefined, progressOf(now, Date.now())?.total));
    meta.append(row);
    progressTrack = now;
    tickProgress();
  }

  const box = element('div', card.dim ? 'card dim' : 'card');
  const body = element('div', 'card-body');
  body.append(cover, meta);
  box.append(element('div', 'card-label', card.header), body);
  if (card.button) box.append(link(card.button.url, 'play', card.button.label));

  return [element('div', 'now-title', 'On Discord'), box, element('p', 'hint', note)];
}

function renderNow(status: Status): void {
  const model = buildPopupModel(status);
  const container = byId('now');
  progressTrack = null;

  if (!model.card || !status.now) {
    const empty = element('div', 'empty');
    const text = element('p');
    text.append(
      element('strong', undefined, 'Nothing playing'),
      document.createElement('br'),
      'Press play on YouTube Music and it shows up here.',
    );
    empty.append(text, link('https://music.youtube.com', 'btn primary', 'Open YouTube Music'));
    container.replaceChildren(empty);
    return;
  }
  container.replaceChildren(...renderCard(model.card, model.note, status.now));
}

function tickProgress(): void {
  if (!progressTrack || !progressFill || !progressElapsed) return;
  const progress = progressOf(progressTrack, Date.now());
  if (!progress) return;
  progressFill.style.width = `${progress.fraction * 100}%`;
  progressElapsed.textContent = progress.elapsed;
}

function isEditing(control: Element): boolean {
  return document.activeElement === control;
}

function renderSettings(settings: Settings, languageRow: boolean, languageNote: string): void {
  master.setAttribute('aria-checked', String(settings.enabled));
  masterText.textContent = settings.enabled ? 'On' : 'Off';
  progressSwitch.setAttribute('aria-checked', String(settings.showProgress));
  buttonSwitch.setAttribute('aria-checked', String(settings.showButton));
  originalTitleSwitch.setAttribute('aria-checked', String(settings.originalTitle));
  for (const button of statusSeg.querySelectorAll('button')) {
    button.setAttribute('aria-checked', String(button.dataset.value === settings.statusText));
  }
  langRow.hidden = !languageRow;
  langNote.textContent = languageNote;
  // Leave a dropdown alone while the user has it open.
  if (!isEditing(langSelect)) langSelect.value = settings.language;
  if (!isEditing(pausedSelect)) pausedSelect.value = settings.whenPaused;
}

function render(status: Status): void {
  latest = status;
  // Heartbeats change little; rebuilding the DOM only when something changed keeps hover and focus.
  const key = JSON.stringify(status);
  if (key !== lastRendered) {
    lastRendered = key;
    const model = buildPopupModel(status);
    byId('health').replaceChildren(pill('Helper', model.health.host), pill('Discord', model.health.discord));
    renderBanner(model.banner);
    renderNow(status);
    renderSettings(status.settings, model.languageRow, model.languageNote);
    byId('version').textContent = `Version ${status.version}`;
  }
}

// --- talking to the background script -----------------------------------------------------------

async function send(message: PopupMessage): Promise<void> {
  try {
    const status: Status | undefined = await ext.runtime.sendMessage(message);
    if (status) render(status);
  } catch {
    // The background script was not listening yet; the next refresh will retry.
  }
}

function change(patch: Partial<Settings>): void {
  void send({ type: 'setSettings', patch });
}

// --- wiring -------------------------------------------------------------------------------------

const automatic = document.createElement('option');
automatic.value = AUTO_LANGUAGE;
automatic.textContent = 'Automatic';
langSelect.append(automatic);
for (const { code, name } of LANGUAGES) {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = name;
  langSelect.append(option);
}

master.addEventListener('click', () => latest && change({ enabled: !latest.settings.enabled }));
progressSwitch.addEventListener('click', () => latest && change({ showProgress: !latest.settings.showProgress }));
buttonSwitch.addEventListener('click', () => latest && change({ showButton: !latest.settings.showButton }));
originalTitleSwitch.addEventListener(
  'click',
  () => latest && change({ originalTitle: !latest.settings.originalTitle }),
);
langSelect.addEventListener('change', () => change({ language: langSelect.value }));
pausedSelect.addEventListener('change', () => change({ whenPaused: pausedSelect.value as Settings['whenPaused'] }));
for (const button of statusSeg.querySelectorAll('button')) {
  button.addEventListener('click', () => change({ statusText: button.dataset.value as StatusText }));
}
copyDiagnostics.addEventListener('click', () => {
  if (!latest) return;
  const text = formatDiagnostics(latest, {
    userAgent: navigator.userAgent,
    browserLanguage: ext.i18n.getUILanguage(),
  });
  void copyText(text, copyDiagnostics, 'Copy diagnostics');
});

void send({ type: 'getStatus' });
setInterval(() => void send({ type: 'getStatus' }), REFRESH_MS);
setInterval(tickProgress, PROGRESS_TICK_MS);
