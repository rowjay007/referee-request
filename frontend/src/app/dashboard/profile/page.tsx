"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ProfileState = {
  fullName: string;
  preferredName: string;
  email: string;
  country: string;
  timezone: string;
  background: string;
};

const STORAGE_KEY = "rr_profile_draft";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState>(() => {
    const base: ProfileState = {
      fullName: "",
      preferredName: "",
      email: "",
      country: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      background: "",
    };
    if (typeof window === "undefined") return base;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    try {
      return JSON.parse(raw) as ProfileState;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return base;
    }
  });
  const [message, setMessage] = useState("");

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setMessage("Profile draft saved on this device.");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 pb-12 sm:px-10">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted">
          Keep only what helps your requests: name, contact, and location context.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={profile.fullName} onChange={(value) => setProfile((p) => ({ ...p, fullName: value }))} />
          <Field label="Preferred name" value={profile.preferredName} onChange={(value) => setProfile((p) => ({ ...p, preferredName: value }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" type="email" value={profile.email} onChange={(value) => setProfile((p) => ({ ...p, email: value }))} />
          <Field label="Country" value={profile.country} onChange={(value) => setProfile((p) => ({ ...p, country: value }))} />
        </div>
        <Field label="Timezone" value={profile.timezone} onChange={(value) => setProfile((p) => ({ ...p, timezone: value }))} />
        <label className="block space-y-1">
          <span className="text-sm text-foreground">Optional academic/professional information</span>
          <textarea className="w-full rounded-md border border-border px-3 py-2" rows={4} value={profile.background} onChange={(event) => setProfile((p) => ({ ...p, background: event.target.value }))} />
        </label>
        <Button onClick={saveDraft}>Save profile draft</Button>
        {message ? <p className="text-sm text-success">{message}</p> : null}
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border px-3 py-2"
      />
    </label>
  );
}
