"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Polls order status by refreshing the server component every 5s. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
