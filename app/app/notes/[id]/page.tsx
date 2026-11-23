import { Suspense } from "react";
import NoteView from "@/components/NoteView";

export const metadata = { title: "Note · Lodal" };

export default function Page() {
  return (
    <Suspense>
      <NoteView />
    </Suspense>
  );
}
