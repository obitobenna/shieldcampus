"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/cn";
import { NIGERIAN_UNIVERSITIES, signupSchema } from "@/lib/validation/auth";
import type { SignupResponse } from "@/app/api/auth/signup/route";

type AccountType = "student" | "vendor";

export function SignupForm({ initialType = "student" }: { initialType?: AccountType }) {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>(initialType);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const input = {
      name: String(form.get("name") ?? ""),
      university: String(form.get("university") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      accountType,
    };

    const parsed = signupSchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    const res = await fetchJson<SignupResponse>("/api/auth/signup", { method: "POST", json: parsed.data });
    setLoading(false);

    if (!res.ok) {
      setErrors(res.fields ?? {});
      if (!res.fields) setFormError(res.error);
      return;
    }
    if (res.data.status === "confirm_email") {
      setConfirmEmail(res.data.email);
      return;
    }
    router.push(res.data.redirectTo);
    router.refresh();
  }

  if (confirmEmail) {
    return (
      <Alert tone="success" title="Check your email">
        We sent a confirmation link to <span className="font-mono">{confirmEmail}</span>. Open it on this device to
        finish creating your account. If you can&apos;t find it, check your spam folder.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-ink">I am joining as</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(
            [
              ["student", "A student", "Learn and earn ZEC"],
              ["vendor", "A campus vendor", "Accept ZEC payments"],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={cn(
                "cursor-pointer rounded-md border bg-surface p-3 transition-colors duration-150 ease-out has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                accountType === value ? "border-brand bg-brand-soft" : "border-line hover:border-ink/30",
              )}
            >
              <input
                type="radio"
                name="accountType"
                value={value}
                checked={accountType === value}
                onChange={() => setAccountType(value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-ink-muted">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="name" label={accountType === "vendor" ? "Your name (owner)" : "Full name"} error={errors.name}>
        <Input id="name" name="name" autoComplete="name" placeholder="Chiamaka Okafor" invalid={!!errors.name} />
      </Field>

      <Field id="university" label="University" error={errors.university}>
        <Input
          id="university"
          name="university"
          list="universities"
          defaultValue="University of Nigeria, Nsukka"
          invalid={!!errors.university}
        />
        <datalist id="universities">
          {NIGERIAN_UNIVERSITIES.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </Field>

      <Field id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="chiamaka.okafor@unn.edu.ng"
          invalid={!!errors.email}
        />
      </Field>

      <Field id="password" label="Password" hint="At least 8 characters." error={errors.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" invalid={!!errors.password} />
      </Field>

      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <Button type="submit" className="w-full" loading={loading}>
        Create account
      </Button>

      <p className="text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
