import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Better Auth の全エンドポイント（/api/auth/*）を処理する
export const { GET, POST } = toNextJsHandler(auth);
