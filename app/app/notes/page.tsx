import { Suspense } from "react";
import NotesHome from "@/components/NotesHome";

export const metadata = { title: "Notes · Lodal" };

export default function Page() {
  return (
    <Suspense>
      <NotesHome />
    </Suspense>
  );
}
