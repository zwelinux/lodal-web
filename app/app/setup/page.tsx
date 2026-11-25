import { Suspense } from "react";
import SetupPage from "@/components/SetupPage";

export const metadata = { title: "Set up · Lodal" };

export default function Page() {
  return (
    <Suspense>
      <SetupPage />
    </Suspense>
  );
}
