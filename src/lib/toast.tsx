"use client";

// 依存を増やさない軽量トースト実装（sonner 互換の最小API）。
// import { toast } from "@/lib/toast";  →  toast.success("...") / toast.error("...") など
// レイアウトに <Toaster /> を1つ置くだけで動作する。

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "message";

interface ToastItem {
  id: number;
  type: ToastType;
  text: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let counter = 0;

const DURATION_MS = 4000;

function emit() {
  for (const l of listeners) l([...toasts]);
}

function remove(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

// サーバーアクションの result.error は string | undefined のことがあるため広めに受ける
type ToastText = string | number | null | undefined;

function push(type: ToastType, text: ToastText): number {
  const id = ++counter;
  toasts = [...toasts, { id, type, text: text == null ? "" : String(text) }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => remove(id), DURATION_MS);
  }
  return id;
}

// sonner 互換のトースト API
export const toast = Object.assign(
  (text: ToastText) => push("message", text),
  {
    success: (text: ToastText) => push("success", text),
    error: (text: ToastText) => push("error", text),
    info: (text: ToastText) => push("info", text),
    message: (text: ToastText) => push("message", text),
    dismiss: (id?: number) => {
      if (id == null) {
        toasts = [];
        emit();
      } else {
        remove(id);
      }
    },
  }
);

const typeStyles: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-indigo-200 bg-indigo-50 text-indigo-800",
  message: "border-slate-200 bg-white text-slate-800",
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (next) => setItems(next);
    listeners.add(listener);
    listener([...toasts]);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold shadow-lg animate-in fade-in slide-in-from-top-2 ${typeStyles[t.type]}`}
        >
          <span className="flex-1 whitespace-pre-wrap break-words">{t.text}</span>
          <button
            type="button"
            onClick={() => remove(t.id)}
            aria-label="閉じる"
            className="shrink-0 opacity-50 transition-opacity hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
