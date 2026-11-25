import { Suspense } from "react";
import SetupGate from "@/components/SetupGate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <SetupGate>{children}</SetupGate>
    </Suspense>
  );
}
