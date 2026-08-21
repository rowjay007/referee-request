"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function run() {
      clearAuthToken();
      try {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      } catch {}
      if (active) {
        router.replace("/");
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-6 py-10">
      <p className="text-sm text-muted">Signing you out...</p>
    </main>
  );
}
