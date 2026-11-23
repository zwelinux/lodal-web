import { Suspense } from "react";
import PublicNotePage from "@/components/PublicNotePage";

export const metadata = { title: "Shared note · Lodal", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <PublicNotePage />
    </Suspense>
  );
}
