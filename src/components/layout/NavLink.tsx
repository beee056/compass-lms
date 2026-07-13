"use client";

// 現在地(アクティブ)を強調するナビゲーションリンク。
// Headerはサーバーコンポーネントのため、現在地判定が必要なリンクだけをこのクライアント部品に切り出す。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  title: string;
  children: React.ReactNode;
  // 完全一致で判定するか（"/" などトップは完全一致にする）
  exact?: boolean;
  baseClassName?: string;
  activeClassName?: string;
}

export default function NavLink({
  href,
  title,
  children,
  exact = false,
  baseClassName = "hover:text-indigo-600 transition-colors p-1 rounded-md",
  activeClassName = "text-indigo-600 bg-indigo-50"
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      aria-current={isActive ? "page" : undefined}
      className={cn(baseClassName, isActive && activeClassName)}
    >
      {children}
    </Link>
  );
}
