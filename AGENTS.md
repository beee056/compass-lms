<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 開発・デプロイ運用ルール

## 環境の制約
- **ローカルの作業パスに日本語が含まれる**（`C:\総合型選抜指導管理\...`）ため、`prisma` エンジンや `tsc` が `0xC0000005`(アクセス違反)でクラッシュする。ローカルで `prisma db push` / `pnpm build` / `tsc` は動かない。
  - 根本対策: プロジェクトを **ASCIIパス**（例 `C:\dev\compass-lms`）へ移すと解消する。
- 型チェックは **GitHub Actions の CI**（`.github/workflows/ci.yml`）が `prisma generate` + `tsc --noEmit` で担保する。

## 本番デプロイ
- 本番プロジェクトは Vercel の **`compass-lms`（無印）** ただ一つ。本番ドメインは **`compass.p-quest.com`**。GitHub `master` への push で自動デプロイ。
- 環境変数（`DATABASE_URL`/`DIRECT_URL`/`CRON_SECRET`/`GOOGLE_GENERATIVE_AI_API_KEY`/Clerk各種）は **`compass-lms` プロジェクトの Settings** に設定する。別プロジェクトと取り違えないこと。
- ビルドコマンドは `prisma generate && next build`（DB非依存）。**`prisma db push` はビルドに常設しない**（DB到達不能時に全デプロイが落ちるため）。

## 【厳守】Vercelプロジェクトを増やさない
- 過去に `vercel deploy` / Import の繰り返しで **同一リポジトリに9個の重複プロジェクト** が生成され、
  ビルド枠の奪い合い・cron重複実行・環境変数の混乱を引き起こした（2026-07-14に8個削除して1個に集約済み）。
- **`vercel`（デプロイ）や `vercel link` を未リンク状態で実行しない**こと。未リンク実行は新プロジェクトを自動生成する。
- デプロイは **GitHub `master` への push のみ** で行う。CLIからのデプロイは禁止。
- CLIで環境変数等を操作する場合は、必ず先に `vercel link --project compass-lms` で本番へリンクされていることを確認する。

## スキーマ変更の手順（ローカルでprismaが動かないための回避策）
1. `prisma/schema.prisma` を編集（追加カラムは **nullable か @default 付き** にして既存データを壊さない）。
2. **一時的に** `package.json` の build を `prisma generate && prisma db push && next build` に変更してコミット＆push。
   - unique制約の新規追加など「データ損失の警告」で止まる場合のみ `--accept-data-loss` を付ける（空テーブル前提で非破壊を確認してから）。
3. デプロイのビルドログで `Your database is now in sync` を確認。
4. **すぐに** build を `prisma generate && next build` に戻してコミット＆push（db push を残さない）。
- 将来ASCIIパスへ移行したら、`prisma migrate` によるマイグレーション運用へ切り替えることを推奨。
