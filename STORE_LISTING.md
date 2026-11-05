# Chrome Web Store listing — copy and paste

## Name
TimeZone Shift

## Summary (max 132 characters)
Make any website show its times in another time zone. Includes a floating world clock and a quick time zone converter.

## Category
Productivity → Tools

## Description
Scheduling work for people in another time zone? TimeZone Shift makes any website show its times in their zone, so you see exactly what they see without converting times in your head.

HOW IT WORKS
1. Open the website.
2. Click the TimeZone Shift icon and pick a time zone.
3. Turn on "Show this site in … time". The page reloads in that zone.

FEATURES
• Works with every time zone (400+), with daylight saving handled automatically
• Search by city, country, abbreviation (IST, PST, CET…) or UTC offset
• Remembered per site, so each site can use its own zone
• Floating clock on switched sites showing their time next to yours (drag to move)
• Quick converter between any two zones, with one-click copy
• 12- or 24-hour clock, light and dark mode

GOOD FOR
Dispatch and fleet tools, logistics, support desks, booking systems, admin dashboards, and remote teams working across time zones.

GOOD TO KNOW
• While a site is switched, Chrome shows a bar saying the extension "started debugging this browser". This is how Chrome's built-in time zone emulation is turned on. Click Cancel on it to switch the site off.
• It changes the time zone the browser reports. Sites that use a time zone saved in your account settings on their server won't change.

PRIVACY
No data collection, no tracking, no network requests. Settings stay in your Chrome profile. Open source.

## Single purpose (Privacy practices tab)
Lets the user view chosen websites in a different time zone, and convert times between time zones.

## Permission justifications (Privacy practices tab)

**debugger**
Used only to send Chrome's built-in Emulation.setTimezoneOverride command to tabs of websites the user has chosen to switch, which is the core feature. This is the same time zone emulation available in Chrome DevTools. No other debugger commands are used, and no page content, network traffic, or user data is read.

**tabs**
Used to read the URL of the active tab, so the extension knows which site the user is switching and can apply the right time zone. Also used to reload the tab after switching so the site shows the new times.

**storage**
Saves the user's settings: which sites are switched and to which zone, their own time zone, recent zones, and display preferences.

**Host permission (http://*/*, https://*/*)**
The user can switch any website they choose, so the extension needs to be able to show its floating clock on any site. The content script only displays a clock and does not read page content.

**Remote code**
No, the extension does not use remote code.

## Data usage (Privacy practices tab)
- Does not collect any of the listed data types.
- Certify: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used to determine creditworthiness.

## Privacy policy URL
Link to PRIVACY.md in your GitHub repository, e.g.
https://github.com/YOUR-USERNAME/timezone-shift/blob/main/PRIVACY.md

## Images
- Icon: src/icons/icon128.png
- Screenshots (1280×800): docs/screenshots/1-site-in-another-zone.png, 2-before-after.png, 3-search-any-zone.png
- Small promo tile (440×280): docs/screenshots/promo-tile-440x280.png
