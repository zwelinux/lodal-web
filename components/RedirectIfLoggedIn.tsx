"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { token } from "@/lib/api";

export default function RedirectIfLoggedIn() {
  const router = useRouter();
  useEffect(() => {
    if (token.get()) router.replace("/app");
  }, [router]);
  return null;
}
