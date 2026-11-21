"use client";

const IMAGE = process.env.NEXT_PUBLIC_BANNER_IMAGE; // your own banner picture, e.g. /banner.png or https://...
const LINK = process.env.NEXT_PUBLIC_BANNER_URL; // where a click goes
const ALT = process.env.NEXT_PUBLIC_BANNER_ALT ?? "Advertisement";

/** A simple banner you place yourself. Shown only at the bottom of a project, only for free users. */
export default function AdBanner() {
  return (
    <aside className="ad" aria-label="Advertisement">
      {IMAGE ? (
        <a href={LINK || undefined} target="_blank" rel="noopener sponsored noreferrer" className="adLink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMAGE} alt={ALT} />
        </a>
      ) : (
        <div className="adPlaceholder">Banner space</div>
      )}
      <small className="adTag">Advertisement</small>
    </aside>
  );
}
