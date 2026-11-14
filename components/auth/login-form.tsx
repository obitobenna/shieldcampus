"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { fetchJson } from "@/lib/fetch-json";
import { loginSchema } from "@/lib/validation/auth";
import type { LoginResponse } from "@/app/api/auth/login/route";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      next,
    });
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fields[key]) fields[key] = issue.message;
      }
      setErrors(fields);
      return;
    }
    setErrors({});
    setLoading(true);
    const res = await fetchJson<LoginResponse>("/api/auth/login", { method: "POST", json: parsed.data });
    if (!res.ok) {
      setLoading(false);
      setFormError(res.error);
      return;
    }
    router.push(res.data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="email" label="Email" error={errors.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" invalid={!!errors.email} />
      </Field>
      <Field id="password" label="Password" error={errors.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" invalid={!!errors.password} />
      </Field>

      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <Button type="submit" className="w-full" loading={loading}>
        Log in
      </Button>

      <p className="text-sm text-ink-muted">
        New to ShieldCampus?{" "}
        <Link href="/signup" className="font-medium text-brand underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
