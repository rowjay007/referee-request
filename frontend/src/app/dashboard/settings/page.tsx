"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useAuthToken } from "@/lib/auth";
import { RefereeContact } from "@/lib/requests";
import posthog from "posthog-js";

type SettingsState = {
  timezone: string;
  emailReminders: boolean;
  submissionAlerts: boolean;
  securityUpdates: boolean;
};

const STORAGE_KEY = "rr_settings_draft";

export default function SettingsPage() {
  const token = useAuthToken();
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
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<RefereeContact[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRelationship, setContactRelationship] = useState("");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!token) return;
    apiRequest<{ contacts: RefereeContact[] }>("/referee-contacts", { token })
      .then((data) => setContacts(data.contacts))
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Could not load saved contacts.",
        ),
      );
  }, [token]);

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setMessage("Settings draft saved on this device.");
  }

  function resetContactForm() {
    setContactName("");
    setContactEmail("");
    setContactRelationship("");
    setEditingContactId(null);
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Please sign in to manage contacts.");
      return;
    }
    setSavingContact(true);
    setError("");
    setMessage("");
    try {
      const data = await apiRequest<{ contact: RefereeContact }>(
        editingContactId
          ? `/referee-contacts/${editingContactId}`
          : "/referee-contacts",
        {
          method: editingContactId ? "PUT" : "POST",
          token,
          body: {
            name: contactName,
            email: contactEmail,
            relationship: contactRelationship,
          },
        },
      );
      setContacts((current) => {
        const exists = current.some(
          (contact) => contact.id === data.contact.id,
        );
        return exists
          ? current.map((contact) =>
              contact.id === data.contact.id ? data.contact : contact,
            )
          : [...current, data.contact].sort((a, b) =>
              a.name.localeCompare(b.name),
            );
      });
      setMessage(editingContactId ? "Contact updated." : "Contact saved.");
      posthog.capture(
        editingContactId
          ? "referee_contact_updated"
          : "referee_contact_created",
      );
      resetContactForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the contact.",
      );
    } finally {
      setSavingContact(false);
    }
  }

  async function deleteContact(contactId: string) {
    if (!token) return;
    setDeletingContactId(contactId);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/referee-contacts/${contactId}`, {
        method: "DELETE",
        token,
      });
      setContacts((current) =>
        current.filter((contact) => contact.id !== contactId),
      );
      if (editingContactId === contactId) resetContactForm();
      setMessage("Contact deleted.");
      posthog.capture("referee_contact_deleted");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the contact.",
      );
    } finally {
      setDeletingContactId(null);
    }
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
            onChange={(event) =>
              setSettings((s) => ({ ...s, timezone: event.target.value }))
            }
            className="w-full rounded-md border border-border px-3 py-2"
          />
        </label>
        <Toggle
          label="Deadline and reminder emails"
          checked={settings.emailReminders}
          onChange={(checked) =>
            setSettings((s) => ({ ...s, emailReminders: checked }))
          }
        />
        <Toggle
          label="Reference submission notifications"
          checked={settings.submissionAlerts}
          onChange={(checked) =>
            setSettings((s) => ({ ...s, submissionAlerts: checked }))
          }
        />
        <Toggle
          label="Security notifications"
          checked={settings.securityUpdates}
          onChange={(checked) =>
            setSettings((s) => ({ ...s, securityUpdates: checked }))
          }
        />
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-surface p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Referee contacts
          </h2>
          <p className="mt-1 text-sm text-muted">
            Save people you may ask again and reuse them in the request wizard.
          </p>
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted">No saved contacts yet.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{contact.name}</p>
                  <p className="break-all text-sm text-muted">
                    {contact.email}
                  </p>
                  <p className="text-sm text-muted">
                    {contact.relationship || "Relationship not specified"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingContactId(contact.id);
                      setContactName(contact.name);
                      setContactEmail(contact.email);
                      setContactRelationship(contact.relationship);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={deletingContactId === contact.id}
                    onClick={() => deleteContact(contact.id)}
                  >
                    {deletingContactId === contact.id
                      ? "Deleting..."
                      : "Delete"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={saveContact} className="space-y-4">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground">
              {editingContactId ? "Edit contact" : "Add contact"}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Name</span>
                <input
                  required
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Email</span>
                <input
                  required
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">Relationship</span>
              <input
                value={contactRelationship}
                onChange={(event) => setContactRelationship(event.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 outline-none"
              />
            </label>
          </fieldset>
          <div className="flex gap-2">
            <Button disabled={savingContact}>
              {savingContact
                ? "Saving..."
                : editingContactId
                  ? "Update contact"
                  : "Add contact"}
            </Button>
            {editingContactId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={resetContactForm}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Privacy and security
        </h2>
        <p className="text-sm text-muted">
          Account controls, data minimization, and secure access remain enabled.
        </p>
        <Button onClick={saveDraft}>Save settings draft</Button>
        {message ? (
          <p aria-live="polite" className="text-sm text-success">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
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
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
