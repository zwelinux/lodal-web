import { useId } from "react";

/** The Lodal mark: a soft L made of two layered pieces. Drawn inline so it never needs a download. */
export default function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} aria-hidden="true" style={{ flex: "none" }}>
      <defs>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2cb79a" />
          <stop offset=".55" stopColor="#14705f" />
          <stop offset="1" stopColor="#0a2f2b" />
        </linearGradient>
        <radialGradient id={`gl${id}`} cx=".22" cy=".12" r=".85">
          <stop offset="0" stopColor="#a6f8e2" stopOpacity=".42" />
          <stop offset="1" stopColor="#a6f8e2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`v${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d6faf0" />
        </linearGradient>
        <linearGradient id={`h${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8ff5d9" />
          <stop offset="1" stopColor="#36d3ae" />
        </linearGradient>
        <filter id={`s${id}`} x="-40%" y="-20%" width="180%" height="150%">
          <feDropShadow dx="10" dy="12" stdDeviation="16" floodColor="#04201c" floodOpacity=".4" />
        </filter>
      </defs>
      <rect width="1024" height="1024" rx="232" fill={`url(#bg${id})`} />
      <rect width="1024" height="1024" rx="232" fill={`url(#gl${id})`} />
      <rect x="300" y="652" width="456" height="148" rx="74" fill={`url(#h${id})`} />
      <rect x="300" y="222" width="148" height="578" rx="74" fill={`url(#v${id})`} filter={`url(#s${id})`} />
    </svg>
  );
}
