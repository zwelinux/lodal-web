"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api, token } from "@/lib/api";

const FREE = ["/app/setup", "/app/connect"]; // pages that work before setup is finished

/** Everyone connects Google Drive and Google Calendar once, right after signing up. Until then the app sends them to the setup page. */
export default function SetupGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (FREE.some((p) => path.startsWith(p)) || !token.get()) return;
    api
      .me()
      .then((u) => {
        if (u.google && (!u.google.drive || !u.google.calendar)) router.replace("/app/setup");
      })
      .catch(() => {});
  }, [path, router]);
  return <>{children}</>;
}
