import { bexBackground } from 'quasar/wrappers';

type INotification = {
	$type: string;
	id: string;
	content: string;
	metadata: string;
};

function openExtension() {
	chrome.tabs.create(
		{
			url: chrome.runtime.getURL('www/index.html#/options'),
		},
		(/* newTab */) => {
			// Tab opened.
		}
	);
}

chrome.runtime.onInstalled.addListener(openExtension);
chrome.action.onClicked.addListener(openExtension);

declare module '@quasar/app-vite' {
	interface BexEventMap {
		log: [{ message: string; data?: any[] }, never];
		getTime: [never, number];

		'storage.get': [{ key: string | null }, any];
		'storage.set': [{ key: string; value: any }, any];
		'storage.remove': [{ key: string }, any];
	}
}

let isMounted = false;

export default bexBackground((bridge, allActiveConnections) => {
	if (!isMounted) {
		isMounted = true;

		setInterval(async () => {
			console.log('interval');
			fetchNotifications();
		}, 60_000);

		fetchNotifications();

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

							// @TODO decode content

							chrome.notifications.create({
								title: 'title: hi',
								message: `message: you got new notification: @TODO decoded content`,
								type: 'basic',
								iconUrl: chrome.runtime.getURL('www/icons/favicon-128x128.png'),
							});

							alreadyDisplayed.push(notification.id);
						}

						// so that the new notifications don't get shown again
						chrome.storage.session.set({
							displayedNotifications: [...alreadyDisplayed],
						});
					});
				} catch (err) {
					console.error(err);
				}
			});
		}
	}

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
