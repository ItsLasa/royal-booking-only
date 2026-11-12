"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGet, adminPost, ApiError } from "@/lib/admin/api";
import type { AdminUser } from "@/lib/admin/types";
import { Button, Field, Input } from "@/components/admin/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGet<{ user: AdminUser }>("/admin/auth/me")
      .then(() => router.replace("/admin"))
      .catch(() => null);
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await adminPost<{ user: AdminUser }>("/admin/auth/login", { email, password });
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d1a12] px-4 dark:bg-[#0a0f14]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
      
          <h1 className="mt-4 text-2xl font-normal tracking-tight text-white">Management Console</h1>
          <p className="mt-1 text-sm text-emerald-200/70">Royal Mansion Resort & Villa · Secure Staff Access</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          <div className="space-y-4">
            <Field label="Email Address">
              <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="admin@royalmansionresorts.com" className="border-white/15 bg-white/5 text-white placeholder:text-neutral-500" />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} placeholder="••••••••" className="border-white/15 bg-white/5 pr-20 text-white placeholder:text-neutral-500" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-normal text-emerald-300/80 hover:text-emerald-200">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
          </div>

          {error && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300" role="alert">{error}</p>}

          <Button type="submit" loading={loading} className="mt-6 w-full bg-emerald-600 text-white hover:bg-emerald-500">
            {loading ? "Signing In…" : "Sign In to Console"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-emerald-200/50">Protected hotel management system — all activities are logged and audited.</p>
      </div>
    </main>
  );
}
