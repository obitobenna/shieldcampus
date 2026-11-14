"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { fetchJson } from "@/lib/fetch-json";
import { NIGERIAN_UNIVERSITIES } from "@/lib/validation/auth";

type Lang = "en" | "pcm";

export function ProfileForm({
  initial,
  email,
  universityLabel,
}: {
  initial: { name: string; university: string; preferredLanguage: Lang };
  email: string;
  universityLabel: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [university, setUniversity] = useState(initial.university);
  const [lang, setLang] = useState<Lang>(initial.preferredLanguage);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const dirty = name !== initial.name || university !== initial.university || lang !== initial.preferredLanguage;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrors({});
    setFormError(null);
    const res = await fetchJson("/api/account/profile", {
      method: "PATCH",
      json: { name, university, preferredLanguage: lang },
    });
    if (!res.ok) {
      setStatus("error");
      setErrors(res.fields ?? {});
      if (!res.fields) setFormError(res.error);
      return;
    }
    setStatus("saved");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="name" label="Full name" error={errors.name}>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" invalid={!!errors.name} />
      </Field>
      <Field id="university" label={universityLabel} error={errors.university}>
        <Input
          id="university"
          list="universities-list"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          invalid={!!errors.university}
        />
        <datalist id="universities-list">
          {NIGERIAN_UNIVERSITIES.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </Field>
      <Field id="email" label="Email" hint="Your login email can't be changed here.">
        <Input id="email" value={email} readOnly disabled />
      </Field>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium">Lesson language</legend>
        <div className="inline-grid grid-cols-2 rounded-md border border-line bg-surface p-1" role="radiogroup">
          {(
            [
              ["en", "English"],
              ["pcm", "Pidgin"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                "cursor-pointer rounded px-4 py-2 text-center text-sm font-medium transition-colors duration-150 ease-out has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                lang === value ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              )}
            >
              <input
                type="radio"
                name="lang"
                value={value}
                checked={lang === value}
                onChange={() => setLang(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">Lessons open in this language. You can switch on any lesson.</p>
      </fieldset>

      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={status === "saving"} disabled={!dirty}>
          Save changes
        </Button>
        {status === "saved" && !dirty ? (
          <span role="status" className="text-sm text-success">
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
