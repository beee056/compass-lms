# 認証移行: Clerk → Better Auth

作成日: 2026-07-19 / ブランチ: `feat/better-auth`（masterには完成・検証後にのみマージ）

## 決定事項（ユーザー確認済み）
- 目的: コスト削減＋完全な自前管理
- メール送信: Resend（確認メール・パスワード再設定を送る）
- 既存ユーザー: 同じメールで再登録（メール一致で塾・生徒データを自動再リンク／PWのみ再設定）
- メール確認: サインアップ時は残す

## アーキテクチャ方針

- Better Auth の user モデルを **既存 `User` テーブルにマッピング**（二重管理を避ける）。
  - 追加: `emailVerified Boolean` / `image String?`
  - 変更: `clerkId` を撤去、`tenantId` を nullable 化（プロビジョニング前の一瞬に対応）
  - パスワードは Better Auth 標準どおり `Account`（providerId=credential）に保存
- Better Auth 用テーブルを追加: `Session` / `Account` / `Verification`
- プロビジョニング（テナント作成/承認待ち・生徒/運営者リンク）は
  **サインアップ後フック + getCurrentユーザー時のフォールバック**で移植。
  ロジックは現行の getCurrentUser 1.5/1.6 と createStudent 分岐をそのまま踏襲。
- セッション取得は `auth.api.getSession({ headers })` に統一。`getCurrentUser` はこの上に構築。

## touchpoint 置換表

| 現行(Clerk) | 置換(Better Auth) |
|---|---|
| `middleware.ts` clerkMiddleware | Better Auth セッションcookieを見る軽量ミドルウェア（公開ルートは維持） |
| `layout.tsx` ClerkProvider | 不要（削除） |
| `auth()` / `currentUser()` | `auth.api.getSession()` |
| `User.clerkId` | `User.id`（Better Authが発行） |
| `<SignIn/>` `<SignUp/>` | 自作フォーム `/sign-in` `/sign-up` |
| `<UserButton/>` | 自作アカウントメニュー |
| `SignInButton`/`SignUpButton`（Header・demo） | Linkまたは自作ボタン |
| `/api/webhooks/clerk`(svix) | 不要（削除。プロビジョニングはフックで） |
| CLERK_* env / redirect URL | BETTER_AUTH_SECRET / BETTER_AUTH_URL / RESEND_API_KEY |

## 必要な環境変数（新規）
- `BETTER_AUTH_SECRET`（ランダム32B。こちらで生成）
- `BETTER_AUTH_URL`（本番 https://compass.p-quest.com / ローカル http://localhost:3000）
- `RESEND_API_KEY`（**ユーザーに取得依頼**）
- `EMAIL_FROM`（例: no-reply@p-quest.com。Resendで送信ドメイン検証=DNS必要）

## ユーザーにお願いする作業
1. Resend アカウント作成 → API キー発行 → ここに共有
2. Resend で送信ドメイン（p-quest.com か mail.p-quest.com）を検証（SPF/DKIM のCNAMEをムームードメインへ追加）
3. 全ユーザーへ「新ログインで初回パスワード再設定 or 再登録」を周知

## フェーズ
- P1 スキーマ（本ブランチのみ・本番DBには未適用）
- P2 サーバー設定・getCurrentUser 移植
- P3 認証UI自作
- P4 Clerk撤去・env・ブラウザ動作確認 → master マージ → 本番DBマイグレーション

## 安全策
- master・本番DBは完成まで一切触らない
- 本番DBマイグレーションは「追加のみ（Session/Account/Verification/emailVerified/image追加、tenantId nullable化）」で、clerkIdは当面残置→移行完了後に別途削除

## 実装状況（2026-07-19）
- ブランチ `feat/better-auth` に全コード実装済み。typecheck・build 通過。@clerk/svix 削除済み。
- 未実施（cutover時にまとめて）:
  1. 本番Vercel env: BETTER_AUTH_SECRET / BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL / RESEND_API_KEY / EMAIL_FROM を設定、CLERK_* を削除
  2. 本番DB: `prisma db push`（追加のみ）
  3. `node scripts/migrate-clerk-to-better-auth.mjs --commit`（旧User削除・ownerEmail記録・生徒リンク解除）
  4. master へマージ → 本番デプロイ
  5. 全ユーザーへ「同じメールで再登録」を周知

## cutover 手順（Runbook）
> 本番反映は必ずこの順で。DBはNeonブランチでリハーサル推奨。

```
# 1. Vercel本番envを更新（Clerk削除・BetterAuth追加）
# 2. スキーマ適用（追加のみ）
npx prisma db push
# 3. 既存ユーザーの移行（ドライラン→本番）
node scripts/migrate-clerk-to-better-auth.mjs         # 確認
node scripts/migrate-clerk-to-better-auth.mjs --commit # 実行
# 4. マージ＆デプロイ
git checkout master && git merge feat/better-auth && git push
```

## ユーザー提供待ち
- **RESEND_API_KEY**（Resendでアカウント作成→APIキー）
- **送信ドメインのDNS**（Resendで p-quest.com か mail.p-quest.com を検証。ムームードメインにSPF/DKIMのCNAME追加）
- EMAIL_FROM の最終決定（例: no-reply@p-quest.com）
