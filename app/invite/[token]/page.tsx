import { Suspense } from "react";
import InvitePage from "@/components/InvitePage";

export const metadata = { title: "Invitation · Lodal" };

export default function Page() {
  return (
    <Suspense>
      <InvitePage />
    </Suspense>
  );
}
