import { Suspense } from "react";
import PublicReportPage from "@/components/PublicReportPage";

export const metadata = { title: "Progress report · Lodal", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <PublicReportPage />
    </Suspense>
  );
}
