// frontend/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "@/lib/api";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    api
      .me()
      .then((user) => {
        router.replace(user.role === "admin" ? "/admin" : "/dashboard");
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-slate-500">
      Loading…
    </main>
  );
}
