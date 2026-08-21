"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SettingsState = {
  timezone: string;
  emailReminders: boolean;
  submissionAlerts: boolean;
  securityUpdates: boolean;
};

const STORAGE_KEY = "rr_settings_draft";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const base: SettingsState = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      emailReminders: true,
      submissionAlerts: true,
      securityUpdates: true,
    };
    if (typeof window === "undefined") return base;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    try {
      return JSON.parse(raw) as SettingsState;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return base;
    }
  });
  const [message, setMessage] = useState("");

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setMessage("Settings draft saved on this device.");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 pb-12 sm:px-10">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Account preferences, timezone, and notification controls.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
        <label className="block space-y-1">
          <span className="text-sm text-foreground">Timezone</span>
          <input
            value={settings.timezone}
            onChange={(event) => setSettings((s) => ({ ...s, timezone: event.target.value }))}
            className="w-full rounded-md border border-border px-3 py-2"
          />
        </label>
        <Toggle
          label="Deadline and reminder emails"
          checked={settings.emailReminders}
          onChange={(checked) => setSettings((s) => ({ ...s, emailReminders: checked }))}
        />
        <Toggle
          label="Reference submission notifications"
          checked={settings.submissionAlerts}
          onChange={(checked) => setSettings((s) => ({ ...s, submissionAlerts: checked }))}
        />
        <Toggle
          label="Security notifications"
          checked={settings.securityUpdates}
          onChange={(checked) => setSettings((s) => ({ ...s, securityUpdates: checked }))}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Privacy and security</h2>
        <p className="text-sm text-muted">Account controls, data minimization, and secure access remain enabled.</p>
        <Button onClick={saveDraft}>Save settings draft</Button>
        {message ? <p className="text-sm text-success">{message}</p> : null}
      </section>
    </main>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
