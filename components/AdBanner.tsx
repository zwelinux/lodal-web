"use client";
import Script from "next/script";
import { useEffect, useRef } from "react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT; // e.g. ca-pub-1234567890123456
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT; // the ad unit id from AdSense

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** Google ad for free users. Renders nothing for Pro users, and a quiet placeholder while AdSense is not configured. */
export default function AdBanner({ onUpgrade }: { onUpgrade: () => void }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (!CLIENT || !SLOT || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  return (
    <aside className="ad" aria-label="Advertisement">
      {CLIENT && SLOT ? (
        <>
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={CLIENT}
            data-ad-slot={SLOT}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </>
      ) : (
        process.env.NODE_ENV !== "production" && <div className="adPlaceholder">Ad space (set AdSense keys to show ads)</div>
      )}
      <button className="linkBtn" onClick={onUpgrade}>
        Remove ads for $1 a month
      </button>
    </aside>
  );
}
