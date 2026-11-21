"use client";
import { addDays, today } from "@/lib/dates";
import DatePicker from "./DatePicker";

export default function DateNav({ day, setDay, step, label, showToday }: { day: string; setDay: (d: string) => void; step: number; label: string; showToday: boolean }) {
  return (
    <div className="dateNav">
      <button className="iconBtn" aria-label="Previous" onClick={() => setDay(addDays(day, -step))}>
        ‹
      </button>
      <DatePicker value={day} onChange={setDay} label={label} />
      <button className="iconBtn" aria-label="Next" onClick={() => setDay(addDays(day, step))}>
        ›
      </button>
      {showToday && (
        <button className="btn todayBtn" onClick={() => setDay(today())}>
          Back to today
        </button>
      )}
    </div>
  );
}
