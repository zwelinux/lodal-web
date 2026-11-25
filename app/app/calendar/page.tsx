import { Suspense } from "react";
import CalendarSettings from "@/components/CalendarSettings";

export const metadata = { title: "Google Calendar · Lodal" };

export default function Page() {
  return (
    <Suspense>
      <CalendarSettings />
    </Suspense>
  );
}
