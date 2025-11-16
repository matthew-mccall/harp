"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EnterToStart() {
  const router = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        router.push("/interview");
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  return null; // This component renders nothing — it's just a listener
}