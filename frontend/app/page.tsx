// frontend/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "@/lib/api";
import { getToken, clearToken } from "@/lib/auth";

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
        if (user.role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/dashboard");
        }
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
