# Privacy Policy — TimeZone Shift

_Last updated: November 6, 2026_

TimeZone Shift does not collect, sell, or share any personal data.

## What the extension stores

These settings are saved with Chrome's `storage` API:

- the websites (hostnames only, e.g. `app.example.com`) you switch to another time zone, and the zone chosen for each
- your preferences: your own time zone, recently used zones, 12/24-hour clock, whether the floating clock is shown, and where you dragged it

If Chrome Sync is turned on, Chrome syncs these settings between your own browsers. They are never sent to the developer or anyone else.

## What the extension does not do

- It does not read, collect, or transmit page content, form data, passwords, cookies, or browsing history.
- It makes no network requests and contains no analytics, ads, or third-party code.

## Permissions

- **debugger** — used only to send Chrome's `Emulation.setTimezoneOverride` command to tabs of the sites you switch. No other debugger commands are used, and no page data is read.
- **tabs** — to know which site the current tab shows, so the right time zone is applied and the page can be reloaded after you switch.
- **storage** — to save the settings listed above.
- **Access to websites** — to show the floating clock on the sites you switch.

## Contact

Questions: open an issue on the project's GitHub repository.
