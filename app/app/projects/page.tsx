import { Suspense } from "react";
import ProjectsHome from "@/components/ProjectsHome";

export const metadata = { title: "Projects · Lodal" };

export default function Page() {
  return (
    <Suspense>
      <ProjectsHome />
    </Suspense>
  );
}
