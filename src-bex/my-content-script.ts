import { bexContent } from 'quasar/wrappers';
import { BexBridge } from '@quasar/app-vite';

let bridge: BexBridge;

const iconLink = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
const originalIconHref = iconLink.href;

// when you focus any tab running this script, remove the notification favicon from all tabs
window.addEventListener('focus', async () => {
	await bridge.send('tabNotification.clear');
});

export default bexContent((_bridge) => {
	bridge = _bridge;

	bridge.on('tabNotification.create', async ({ respond }) => {
		iconLink.href = chrome.runtime.getURL('www/icons/youtrack-notification.png');
		await respond();
	});

	bridge.on('tabNotification.clear', async ({ respond }) => {
		iconLink.href = originalIconHref;
		await respond();
	});
});
