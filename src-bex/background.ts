import { bexBackground } from 'quasar/wrappers';
import pako from 'pako';
import { BexBridge } from '@quasar/app-vite';

type INotification = {
	$type: string;
	id: string;
	content: string;
	metadata: string;
};

declare module '@quasar/app-vite' {
	interface BexEventMap {
		log: [{ message: string }, any];
		getTime: [never, number];

		'tabNotification.register': [{ url: string }, any];
		'tabNotification.create': [never, any];
		'tabNotification.clear': [never, any];

		'storage.get': [{ key: string | null }, any];
		'storage.set': [{ key: string; value: any }, any];
		'storage.remove': [{ key: string }, any];
	}
}

// so that we have access to the bridge outside the bexBackground callback
// (we can't put everything in the callback, because it is run whenever we open new tab, etc.)
let bridge: BexBridge | undefined;

chrome.runtime.onInstalled.addListener(() => {
	// open the options with form, so that user can immediately fill it out
	openExtensionOptions();

	setupInterval();
});

chrome.runtime.onStartup.addListener(() => {
	setupInterval();

	// register content script if we know the url after browser start
	chrome.storage.local.get(['YouTrackUrl'], async (items) => {
		const { YouTrackUrl } = items;
		if (YouTrackUrl === undefined) {
			return;
		}

		await registerContentScript(YouTrackUrl);
	});
});

chrome.notifications.onClicked.addListener((notificationId) => {
	// you can pass data through the notification id - see here https://github.com/Seldszar/Gumbo/blob/main/src/background/index.ts#L350
	const [id, notificationType, data] = notificationId.split(':');

	switch (notificationType) {
		case 'issue': {
			chrome.storage.local.get(['YouTrackUrl'], async (items) => {
				const { YouTrackUrl } = items;

				const issueUrl = `https://${YouTrackUrl}/issue/${data}`;

				await chrome.tabs.create({ url: issueUrl });
			});
		}
	}
});

export default bexBackground((_bridge, allActiveConnections) => {
	bridge = _bridge;

	bridge.on('tabNotification.register', async ({ data, respond }) => {
		await registerContentScript(data.url);
		await respond();
	});

	/**
	 * this just resends the event to all content scripts, because sending even from content script
	 * for some reason doesn't send the event to other content scripts
	 * https://github.com/quasarframework/quasar/issues/14778
	 */
	bridge.on('tabNotification.clear', async ({ data, respond }) => {
		await bridge!.send('tabNotification.clear');
		await respond();
	});

	bridge.on('log', async ({ data, respond }) => {
		console.log(`[BEX] ${data.message}`);
		await respond();
	});

	bridge.on('getTime', async ({ respond }) => {
		await respond(Date.now());
	});

	bridge.on('storage.get', ({ data, respond }) => {
		const { key } = data;
		if (key === null) {
			chrome.storage.local.get(null, async (items) => {
				// Group the values up into an array to take advantage of the bridge's chunk splitting.
				await respond(Object.values(items));
			});
		} else {
			chrome.storage.local.get([key], async (items) => {
				await respond(items[key]);
			});
		}
	});

	bridge.on('storage.set', ({ data, respond }) => {
		chrome.storage.local.set({ [data.key]: data.value }, async () => {
			await respond();
		});
	});

	bridge.on('storage.remove', ({ data, respond }) => {
		chrome.storage.local.remove(data.key, async () => {
			await respond();
		});
	});
});

function openExtensionOptions() {
	chrome.tabs.create(
		{
			url: chrome.runtime.getURL('www/index.html#/options'),
		},
		(/* newTab */) => {
			// Tab opened.
		}
	);
}

function setupInterval() {
	fetchNotifications();

	setInterval(() => {
		fetchNotifications();
	}, 60_000);
}

function fetchNotifications() {
	chrome.storage.local.get(['YouTrackApiToken', 'YouTrackUrl'], async (items) => {
		const { YouTrackApiToken, YouTrackUrl } = items;
		if (YouTrackApiToken === undefined || YouTrackUrl === undefined) {
			return;
		}

		const bearer = `Bearer ${YouTrackApiToken}`;
		// https://stackoverflow.com/questions/51596809/how-do-i-access-user-notifications-via-rest-in-youtrack
		const url = `https://${YouTrackUrl}/api/users/notifications?fields=id,content,metadata`;

		try {
			const res = await fetch(url, {
				headers: {
					Authorization: bearer,
				},
			});
			const notifications: INotification[] = await res.json();
			console.log(notifications);

			chrome.storage.session.get(['displayedNotifications'], async (items) => {
				// IDs of all notifications that have already been show to the user
				const alreadyDisplayed: string[] = items.displayedNotifications ?? [];

				for (const notification of notifications) {
					if (alreadyDisplayed.includes(notification.id)) {
						// this one was already displayed
						continue;
					}

					const message = decodeAndDecompress(notification.content);
					const { formattedMessage, issueId } = parseMessage(message);

					chrome.notifications.create(`${Date.now()}:issue:${issueId}`, {
						type: 'basic',
						contextMessage: 'YouNotify',
						title: 'New YouTrack notification',
						message: formattedMessage,
						isClickable: true,
						iconUrl: chrome.runtime.getURL('www/icons/favicon-128x128.png'),
					});

					/**
					 * the bexBackground callback is fired when:
					 * - extension's options are opened for the first time
					 * - whenever page with content script is opened (this isn't 100% reliable though...)
					 * - ???
					 *
					 * But usually it's not fired when you start browser, which means bridge can be undefined.
					 */
					if (bridge !== undefined) {
						bridge.send('tabNotification.create');
					}

					// so that the new notifications don't get shown again
					alreadyDisplayed.push(notification.id);
				}

				await chrome.storage.session.set({
					displayedNotifications: alreadyDisplayed,
				});
			});
		} catch (err) {
			console.error(err);
		}
	});
}

function decodeAndDecompress(encodedString: string): string {
	const base64Decoded = atob(encodedString);

	const binaryString = new Uint8Array(base64Decoded.split('').map((char) => char.charCodeAt(0)));

	const decompressed = pako.ungzip(binaryString, { to: 'string' });

	return decompressed;
}

function parseMessage(message: string) {
	const lines: string[] = message
		.split('--------------------')
		// the last part just says why you received this notification - nobody cares about that
		.slice(0, -1)
		// remove all the html stuff
		.map((part) => part.replaceAll('<p>', ''))
		.map((part) => part.replaceAll('</p>', ''))
		// split it into actual lines
		.flatMap((part) => part.split('\n'))
		// remove all whitespace characters
		.map((part) => part.trim())
		// first and last lines are always empty
		.slice(1, -1);

	const issueUrl = lines.splice(3, 1)[0];
	const urlParts = issueUrl.split('/');
	const issueId = urlParts[urlParts.length - 1];

	return {
		issueId,
		formattedMessage: lines.join('\n'),
	};
}

/**
 * Dynamically registers content script for given url and immediately injects the content script into all matching tabs
 * (we don't know the url before the user saves it in the settings page, so we can't put the url into manifest.json)
 */
async function registerContentScript(url: string) {
	const scriptId = 'my-content-script';

	// unregister all previous content scripts
	try {
		await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
	} catch (err) {
		console.warn(err);
	}

	try {
		await chrome.scripting.registerContentScripts([
			{
				id: scriptId,
				js: ['my-content-script.js'],
				persistAcrossSessions: false,
				matches: [`*://${url}/*`],
			},
		]);

		// after browser start, we need to wait until the tab is "activated".
		// if we don't wait, chrome thinks the content script is not registered yet and will throw error
		await new Promise((r) => setTimeout(r, 30_000));

		// registering a script doesn't inject it until the tab is refreshed / opened again, so we have to
		// manually inject it into currently opened tabs
		const tabs = await chrome.tabs.query({ url: `*://${url}/*` });
		for (const tab of tabs) {
			if (tab.id === undefined) {
				console.error('tab without id', tab);
				continue;
			}

			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				files: ['my-content-script.js'],
			});
		}
	} catch (err) {
		console.error(err);
	}
}
