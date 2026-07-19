import Link from "next/link";
import { Compass } from "lucide-react";

// 認証フォーム共通のカードレイアウト
export default function AuthShell({
  title,
  subtitle,
  children,
  footer
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-white">
            <Compass className="h-5 w-5" />
          </span>
          <span className="text-lg font-black text-foreground">Scholar Compass</span>
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-800">{title}</h1>
          {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}
