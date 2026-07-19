import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// 公開ルート（未ログインでもアクセス可）
const PUBLIC_PATHS = [
  "/demo",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/share", // 保護者向け閲覧専用リンク（トークンでルート内認可）
  "/api/auth", // Better Auth エンドポイント
  "/api/cron" // Vercel Cron（ルート内でBearer認証）
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // セッションクッキーの有無だけを軽量にチェック（詳細な検証は各ページ/アクションのgetCurrentUserで実施）
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"]
};
