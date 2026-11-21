import { Suspense } from "react";
import ProjectView from "@/components/ProjectView";

export const metadata = { title: "Project · Lodal" };

export default function Page() {
  return (
    <Suspense>
      <ProjectView />
    </Suspense>
  );
}
