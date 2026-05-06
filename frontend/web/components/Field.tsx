"use client";

/**
 * Phase 4 (AUTH-03, issue #93) — reusable form input with floating label.
 *
 * Re-authored fresh from frontend/_design-reference/auth.jsx:38-69 per CLAUDE.md
 * hard rule #2 (no JSX import from _design-reference/).
 *
 * Used by app/(auth)/login/page.tsx and app/(auth)/register/page.tsx as the
 * single source of input visuals (UI-SPEC verification hook #5: pages may not
 * use raw <input type="email|password"> — they must go through <Field>).
 *
 * DSGN-06 escape hatches (all confined to this file — see UI-SPEC §"Spacing
 * exceptions" and §"Typography"):
 *   - pt-[18px]              : input top inset (floating-label geometry anchor — reference styles.css:157)
 *   - top-[14px] / top-1.5   : resting / lifted label position (reference styles.css:171, 179)
 *   - text-[10px]            : lifted label size (below Phase 2 type scale; second occurrence in codebase)
 *   - text-[13px]            : resting label size (between text-12 and text-14)
 *   - tracking-[0.06em]      : lifted label letter-spacing (reference styles.css:181)
 */

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
};

export function Field({
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  name,
  autoComplete,
  disabled,
}: FieldProps) {
  const reactId = useId();
  const inputId = `${reactId}-input`;
  const msgId = `${reactId}-msg`;

  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && show ? 'text' : type;

  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder=" "
          aria-describedby={message ? msgId : undefined}
          aria-invalid={error ? true : undefined}
          /* non-tokenized: pt-[18px] is the input top inset for the floating-label geometry — reference styles.css:157. */
          className={cn(
            "peer w-full h-12 px-3.5 pt-[18px] pb-1.5 bg-surface text-text-primary text-14 leading-none rounded-md border outline-none transition-colors duration-150 focus:bg-surface-elevated focus:border-accent disabled:cursor-not-allowed",
            error ? "border-danger" : "border-border"
          )}
        />
        <label
          htmlFor={inputId}
          /* non-tokenized: top-[14px] resting / top-1.5 lifted; text-[13px] resting / text-[10px] lifted; tracking-[0.06em] lifted — reference styles.css:171-183 */
          className="pointer-events-none absolute left-3.5 top-[14px] text-[13px] font-normal text-text-muted leading-none transition-all duration-150 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-medium peer-focus:tracking-[0.06em] peer-focus:uppercase peer-focus:text-text-secondary peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[10px] peer-[&:not(:placeholder-shown)]:font-medium peer-[&:not(:placeholder-shown)]:tracking-[0.06em] peer-[&:not(:placeholder-shown)]:uppercase peer-[&:not(:placeholder-shown)]:text-text-secondary"
        >
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {message && (
        <p
          id={msgId}
          aria-live="polite"
          className={cn(
            "text-12 leading-tight",
            error ? "text-danger" : "text-text-muted"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
