import { Suspense } from "react";
import PulseHome from "@/components/PulseHome";

export const metadata = { title: "Pulse · Lodal" };

export default function Page() {
  return (
    <Suspense>
      <PulseHome />
    </Suspense>
  );
}
