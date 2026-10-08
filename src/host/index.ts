import { install, uninstall } from './install.ts';
import { runHost } from './main.ts';

const args = process.argv.slice(2);

if (args.includes('--install')) {
  const extraIds = args
    .filter((arg) => arg.startsWith('--extension-id='))
    .map((arg) => arg.slice('--extension-id='.length));
  install(extraIds);
} else if (args.includes('--uninstall')) {
  uninstall();
} else {
  // Browsers launch the host with no flags (Chromium passes the caller's origin as an argument).
  runHost();
}
