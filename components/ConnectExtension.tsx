"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { token } from "@/lib/api";
import SimpleBar from "./SimpleBar";

/** Hands your sign-in to the Lodal browser extension, only when you press the button. */
export default function ConnectExtension() {
  const router = useRouter();
  const [found, setFound] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token.get()) {
      router.replace("/login?next=/app/connect");
      return;
    }
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data as { source?: string; type?: string } | null;
      if (d?.source !== "lodal-extension") return;
      if (d.type === "ready") setFound(true);
      if (d.type === "saved") setDone(true);
    };
    window.addEventListener("message", onMsg);
    window.postMessage({ source: "lodal-web", type: "ping" }, window.location.origin); // is the extension here?
    return () => window.removeEventListener("message", onMsg);
  }, [router]);

  function connect() {
    const t = token.get();
    if (t) window.postMessage({ source: "lodal-web", type: "token", token: t }, window.location.origin);
  }

  return (
    <div className="app narrow">
      <SimpleBar />
      <main className="projWrap">
        <h1 className="pageTitle">Browser extension</h1>
        <p className="pageSub">Your day in the browser toolbar. Tick today&apos;s tasks, add a task, or save the page you are reading as a note.</p>
        <div className="emptyBox">
          {done ? (
            <>
              <b>Connected</b>
              <p>Click the Lodal icon in your browser toolbar. You can close this page.</p>
            </>
          ) : found ? (
            <>
              <b>Extension found</b>
              <p>Press Connect to let the extension use your Lodal account on this browser. You can disconnect any time from the extension.</p>
              <button className="btn primary big" style={{ marginTop: 6 }} onClick={connect}>
                Connect
              </button>
            </>
          ) : (
            <>
              <b>Install the extension first</b>
              <p>Add the Lodal extension to Chrome, Edge or Brave, then come back to this page and press Connect.</p>
              <a className="btn primary big" style={{ marginTop: 6 }} href="/lodal-extension.zip" download>
                Download the extension
              </a>
              <ol className="fine proofHelp" style={{ marginTop: 14 }}>
                <li>Unzip the file.</li>
                <li>
                  Open <b>chrome://extensions</b> and turn on Developer mode.
                </li>
                <li>
                  Press <b>Load unpacked</b> and choose the unzipped folder.
                </li>
                <li>Reload this page.</li>
              </ol>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
