// frontend-owner/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    api
      .me()
      .then((user) => {
        if (user.role !== "owner") {
          clearToken();
          router.replace("/login");
          return;
        }
        router.replace("/dashboard");
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-slate-500">
      Loading…
    </main>
  );
}
