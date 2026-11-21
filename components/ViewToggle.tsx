"use client";

/** One small icon: expand to the full schedule, or shrink back to today. */
export default function ViewToggle({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  const label = expanded ? "Back to today" : "Full schedule";
  return (
    <button className="expandBtn" onClick={onClick} aria-label={label} title={label} aria-pressed={expanded}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {expanded ? <path d="M8 3.500V8H3.500M12 3.500V8h4.500M8 16.500V12H3.500M12 16.500V12h4.500" /> : <path d="M3.500 8V3.500H8M16.500 8V3.500H12M3.500 12v4.500H8M16.500 12v4.500H12" />}
      </svg>
    </button>
  );
}
