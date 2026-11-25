import { Suspense } from "react";
import DriveSettings from "@/components/DriveSettings";

export const metadata = { title: "Google Drive · Lodal" };

export default function Page() {
  return (
    <Suspense>
      <DriveSettings />
    </Suspense>
  );
}
