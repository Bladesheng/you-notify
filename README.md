# YouNotify

This is a Chrome browser extension that notifies you whenever you receive YouTrack notification.
I Made this because YouTrack doesn't have any sort of system notifications - only email, jabber or telegram bot, which are all pretty annoying to set up.

## How it works

Once a minute, the extension does this:

- Fetches all your notifications from YouTrack API
- Checks each notification, if it was already displayed to you (saved in session storage)
- If not, then it decodes the notification message and creates a system notification
- It changes the favicon of all open YouTrack tabs in your browser to grab your attention
  - Once you focus that tab, the favicon of all tabs changes back

## Installation

- Download the extension artifact from the [most recent build action](https://github.com/Bladesheng/you-notify/actions)
- [Load it into Chrome](https://quasar.dev/quasar-cli-vite/developing-browser-extensions/build-commands#chrome)
- Make sure that in the extension settings (right-click the icon if they don't open automatically), you set the following:
  - YouTrack API token - generate it [here](https://www.jetbrains.com/help/youtrack/devportal/Manage-Permanent-Token.html#new-permanent-token)
  - YouTrack url - the url of your own YouTrack - for example `bugs.something.com`

## Local development

- Get dependencies:

```sh
pnpm i
```

- Run the dev server

```sh
pnpm run dev:bex
```

- Follow [this guide](https://quasar.dev/quasar-cli-vite/developing-browser-extensions/build-commands#chrome) to load the extension into Chrome
