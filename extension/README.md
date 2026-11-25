# Lodal browser extension

Your Lodal day in the browser toolbar (Chrome, Edge, Brave, and other Chromium browsers).

- **Today**: see today's tasks and tick them off.
- **Add**: add a task to any subject for today.
- **Save page**: save the page you are reading (and any text you selected) as a note in a "Web clips" folder.

## Install (for yourself, today)

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Press **Load unpacked** and choose this `extension` folder (or the unzipped `lodal-extension.zip`).
3. Open Lodal, go to **⋯ > Browser extension**, and press **Connect**.

## How sign-in works

There is no password in the extension. On the Lodal "Connect" page (`/app/connect`) you press **Connect**, and
the page hands your sign-in key to the extension (`content.js`, which only runs on that one page). The key is
kept in the extension's own storage. **Disconnect** in the popup removes it.

## Files

- `manifest.json`: permissions are `storage`, `activeTab`, `scripting` and the Lodal server address only.
- `config.js`: the server and website addresses. Change them if either moves.
- `popup.html`, `popup.css`, `popup.js`: the toolbar window. Plain JavaScript, nothing to build.
- `content.js`: receives the sign-in key on the Connect page.

## Publishing to the Chrome Web Store (later)

1. Make a developer account (one-time fee of 5 USD) at chrome.google.com/webstore/devconsole.
2. Zip the contents of this folder (`lodal-extension.zip` is already that) and upload it.
3. Describe what it does, link the privacy policy (`/privacy`), and explain each permission:
   `storage` keeps the sign-in key, `activeTab` and `scripting` read the title, address and selected text of the
   page only when you press the toolbar button.
4. After review, put the store link on the Connect page instead of the zip.

After editing anything here, rebuild the zip the website serves:

    cd web/extension && rm -f ../public/lodal-extension.zip && zip -qr ../public/lodal-extension.zip . -x "*.DS_Store"
