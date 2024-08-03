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
		log: [{ message: string; data?: any[] }, never];
		getTime: [never, number];

		'storage.get': [{ key: string | null }, any];
		'storage.set': [{ key: string; value: any }, any];
		'storage.remove': [{ key: string }, any];
	}
}

// so that we have access to the bridge outside the bexBackground callback
// (we can't put everything in the callback, because it is run whenever we open new tab, etc.)
let bridge: BexBridge;

chrome.runtime.onInstalled.addListener(openExtensionOptions);
chrome.action.onClicked.addListener(openExtensionOptions);

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

setupInterval();

export default bexBackground((_bridge, allActiveConnections) => {
	bridge = _bridge;

	bridge.on('log', ({ data, respond }) => {
		console.log(`[BEX] ${data.message}`, ...(data.data || []));
		respond();
	});

	bridge.on('getTime', ({ respond }) => {
		respond(Date.now());
	});

	bridge.on('storage.get', ({ data, respond }) => {
		const { key } = data;
		if (key === null) {
			chrome.storage.local.get(null, (items) => {
				// Group the values up into an array to take advantage of the bridge's chunk splitting.
				respond(Object.values(items));
			});
		} else {
			chrome.storage.local.get([key], (items) => {
				respond(items[key]);
			});
		}
	});
	// Usage:
	// const { data } = await bridge.send('storage.get', { key: 'someKey' })

	bridge.on('storage.set', ({ data, respond }) => {
		chrome.storage.local.set({ [data.key]: data.value }, () => {
			respond();
		});
	});
	// Usage:
	// await bridge.send('storage.set', { key: 'someKey', value: 'someValue' })

	bridge.on('storage.remove', ({ data, respond }) => {
		chrome.storage.local.remove(data.key, () => {
			respond();
		});
	});
	// Usage:
	// await bridge.send('storage.remove', { key: 'someKey' })

	/*
  // EXAMPLES
  // Listen to a message from the client
  bridge.on('test', d => {
    console.log(d)
  })

  // Send a message to the client based on something happening.
  chrome.tabs.onCreated.addListener(tab => {
    bridge.send('browserTabCreated', { tab })
  })

  // Send a message to the client based on something happening.
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      bridge.send('browserTabUpdated', { tab, changeInfo })
    }
  })
   */
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

			chrome.storage.session.get(['displayedNotifications'], (items) => {
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

					// so that the new notifications don't get shown again
					alreadyDisplayed.push(notification.id);
				}

				chrome.storage.session.set({
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
