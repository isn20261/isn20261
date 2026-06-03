"use client";

/**
 * Easter egg: type "boi" anywhere on the site and the professor (public/boi.jpg)
 * jumpscares — snaps from a tiny dot to full-screen, fast, with a shake (see the
 * `jumpscare` keyframe in styles/globals.css). Auto-dismisses; click/Esc/any key
 * also dismisses. Purely cosmetic, mounted once globally from the root layout.
 *
 * A rolling buffer of the last few keystrokes is matched against "boi". Typing
 * inside a text field / contentEditable is ignored so it never fires while
 * someone types the sequence into, say, a search or password box.
 */

import { useEffect, useRef, useState } from "react";

const TRIGGER = "boi";
// How long the jumpscare stays up before auto-dismiss (ms). The CSS animation is
// ~0.45s; we hold a touch longer so the shake reads, then fade out.
const HOLD_MS = 1500;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function BoiEasterEgg() {
  const [active, setActive] = useState(false);
  const bufferRef = useRef("");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearHide() {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      // While the jumpscare is up, any key dismisses it.
      if (active) {
        setActive(false);
        clearHide();
        return;
      }
      // Don't capture sequences typed into form fields.
      if (isTypingTarget(e.target)) return;
      // Only single printable characters extend the buffer.
      if (e.key.length !== 1) return;

      const next = (bufferRef.current + e.key.toLowerCase()).slice(-TRIGGER.length);
      bufferRef.current = next;

      if (next === TRIGGER) {
        bufferRef.current = "";
        setActive(true);
        clearHide();
        hideTimer.current = setTimeout(() => {
          setActive(false);
          hideTimer.current = null;
        }, HOLD_MS);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearHide();
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      // Fixed full-screen overlay above everything. Click anywhere to dismiss.
      onClick={() => setActive(false)}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black cursor-pointer overflow-hidden"
      role="presentation"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/boi.jpg"
        alt=""
        className="max-w-none w-screen h-screen object-cover animate-jumpscare"
      />
    </div>
  );
}
