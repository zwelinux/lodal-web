# Publishing the Lodal extension (Chrome, Edge, Firefox)

Build the files first:

    bash web/extension/package.sh

This makes `dist/lodal-chrome.zip` (Chrome Web Store and Microsoft Edge Add-ons) and `dist/lodal-firefox.zip` (Firefox Add-ons),
and refreshes the download on the website. `dist/` is only a build folder; do not commit it.

You (the owner) have to do the sign-up, payment and submit steps. They need your identity and payment details.

## Chrome Web Store (about 5 USD once)

1. Go to https://chrome.google.com/webstore/devconsole and sign in with the Google account that should own the extension.
2. Pay the one-time registration fee and verify your email.
3. Press **New item** and upload `dist/lodal-chrome.zip`.
4. Fill the **Store listing** with the text below. Upload the three screenshots, the promo tile and the icon from the `store/` folder.
5. **Privacy** tab: paste the single purpose and the permission reasons below, set the data disclosures below, and use
   `https://lodal.yatyarzar.com/privacy` as the privacy policy.
6. **Distribution**: Public, all regions. Submit for review. Review usually takes from a day to a few days.
7. When it is approved, tell me the store link and I will put it on the website's "Browser extension" page.

## Microsoft Edge Add-ons (free)

https://partner.microsoft.com/dashboard/microsoftedge. Upload the same `dist/lodal-chrome.zip` and reuse the same text.

## Firefox Add-ons (free)

https://addons.mozilla.org/developers/. Upload `dist/lodal-firefox.zip` (it has the add-on id `lodal@yatyarzar.com`).

## Store text

**Name:** Lodal: Planner and Notes

**Short description (max 132 characters):**
Your Lodal day in the toolbar. Tick today's tasks, add tasks and subjects, and save the page you are reading as a note.

**Category:** Productivity. **Language:** English.

**Description:**
Lodal is a calm planner for your tasks, shared projects and notes. This extension puts your day one click away.

- Today: see today's tasks by subject and tick them off.
- Add: add a task to any subject, or create a new subject.
- Save page: save the page you are reading, with your own note and any text you selected, into your Lodal notes.

You need a free Lodal account (sign in with Google at https://lodal.yatyarzar.com). To connect, open the extension, press Connect, and press Connect again on the Lodal page.
The extension has no ads, no tracking, and sends nothing anywhere except to your Lodal account.

**Single purpose:** Show and update the user's Lodal day (tasks and subjects) and save the current web page into their Lodal notes.

**Permission reasons**

- `storage`: keeps the user's Lodal sign-in key inside the extension, so they stay connected.
- `activeTab`: when the user opens the popup and presses Save page, reads the title and address of the tab they are on. Not used in the background.
- `scripting`: when the user presses Save page, reads the text they selected on that tab. Not used in the background.
- Host permission `https://lodal.vps.webdock.cloud/*`: talks to the Lodal server to load and save the user's tasks and notes.
- Content script on `https://lodal.yatyarzar.com/app/connect*` and `https://lodal.netlify.app/app/connect*`: receives the sign-in key when the user presses Connect on that Lodal page. It runs on that one page only.

**Data disclosures (Privacy tab)**

- Collected: Authentication information (the Lodal sign-in key), Website content (page title, address and selected text, only when the user presses Save page).
- Not collected: personal communications, health, financial, location, web history, user activity.
- Certify: not sold to third parties, not used for purposes unrelated to the single purpose, not used for creditworthiness or lending.
- Uses remote code: No.

**Images (already made, in the `store/` folder)**

- `store/screenshot-1-today.jpg`, `store/screenshot-2-add.jpg`, `store/screenshot-3-save.jpg`: the three screenshots (1280x800). They use made-up tasks, no real data.
- `store/promo-tile-440x280.jpg`: the small promo tile.
- `store/icon-128.png`: the store icon (the same as `icons/icon-128.png`).

Upload the three screenshots in that order. If you change how the extension looks, retake them.
