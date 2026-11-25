// Runs only on the Lodal "Connect the extension" page. When you press Connect there, the page hands over your
// sign-in key and this script keeps it inside the extension. It does nothing on any other page.
(() => {
  const TOKEN = /^[0-9a-f]{40}$/;
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const d = e.data;
    if (!d || d.source !== "lodal-web") return;
    if (d.type === "ping") {
      window.postMessage({ source: "lodal-extension", type: "ready" }, location.origin);
    } else if (d.type === "token" && typeof d.token === "string" && TOKEN.test(d.token)) {
      chrome.storage.local.set({ token: d.token }, () => {
        window.postMessage({ source: "lodal-extension", type: "saved" }, location.origin);
      });
    }
  });
  window.postMessage({ source: "lodal-extension", type: "ready" }, location.origin);
})();
