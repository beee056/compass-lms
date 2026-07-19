"use client";

import { createAuthClient } from "better-auth/react";

// クライアント側の認証クライアント。サインイン/アップ/サインアウト等に使う。
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL
});

export const { signIn, signUp, signOut, useSession, sendVerificationEmail, requestPasswordReset, resetPassword } = authClient;
