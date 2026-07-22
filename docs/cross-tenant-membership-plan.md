# クロステナント（複数塾に同時所属）設計

## 0. 基本方針（最重要）
- `User.tenantId` を **「アクティブ塾」ポインタ** に再定義する。所属の真実源は新テーブル `TenantMembership`。
- **既存の塾スコープクエリ（`where tenantId = user.tenantId`）は無改修**。塾の切替＝アクティブポインタの付け替えだけ。→ テナント分離（＝セキュリティ境界）の仕組みを変えないのが安全確保の要。
- `User.role` / `User.hasFullTenantAccess` は **アクティブ membership の値のキャッシュ**。切替時に更新する。downstream（authz 等）は無改修で動く。
- **生徒(STUDENT)・運営者(isOperator) は現状維持**。membership は非生徒メンターにのみ作る。

## 1. データモデル
```prisma
model TenantMembership {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenantId           String
  tenant             Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  hasFullTenantAccess Boolean @default(true)
  createdAt          DateTime @default(now())
  @@unique([userId, tenantId])
  @@index([userId])
  @@index([tenantId])
}
```
- `role` は当面 membership に持たせず、**owner 判定は既存どおり `tenant.ownerEmail === user.email` を継続**（決定事項①）。limited/full は `hasFullTenantAccess` を membership 単位で保持。
- `StudentMentorAccess`（userId × studentProfileId）は既存のまま。生徒は1塾所属なので実質テナントスコープで整合。

## 2. 移行手順（本番・追加のみ + バックフィル）
順序: **① schema push → ② バックフィル → ③ deploy**（新コードは membership を読むので、バックフィル後にデプロイ）。
1. `TenantMembership` 追加 → `npx prisma db push`（新テーブル・追加のみ・データ損失なし）。
2. 冪等バックフィルスクリプト: `role != "STUDENT"` かつ `tenantId != null` の全 User に対し、`upsert({ userId, tenantId }, { hasFullTenantAccess: 現行値 })`。unique(userId,tenantId) で二重防止。何度流しても安全。
3. deploy（getCurrentUser 改修 / 切替UI / 招待変更）。
- **ロールバック**: ③を戻せば `User.tenantId` 単独の旧挙動に戻る（membership は無害に残置）。

## 3. `getCurrentUser` 改修
- **非生徒**: memberships をロード → `user.tenantId ∈ memberships` を検証。外れていれば先頭 membership に矯正（自己修復）。アクティブ membership の `hasFullTenantAccess` を `user` に反映。返り値に `memberships`（`{ tenantId, name, hasFullTenantAccess, isOwner }[]`）を含め、切替UIに渡す。
- **生徒**: 現状維持。
- **provisionUser**:
  - 招待受諾(A): tenantId を「移動」する代わりに **membership を追加**。→ 既に自分の塾を持つメンターも参加可能に。アクティブ塾は **現状維持**（勝手に画面が変わらない。トーストで通知）（決定事項②）。
  - 新規メンター(E): 自分の塾を作成し、membership を1件作る。
  - 「抜け殻テナント swap」ロジックは不要化（追加で足せるため）。後方互換で当面残置。

## 4. 切替UI（置き場）
- **`Header.tsx`（sticky 上部・サーバーコンポーネント）** に「ワークスペース切替」を新設。
  - 現在の塾名を表示（ロゴ横 or AccountMenu の左）。**membership が2件以上のときだけドロップダウン**、1件なら単なるラベル。
  - 各項目: 塾名 + アクセス範囲バッジ（`フルアクセス` / `N名のみ`）+ owner表示 + 現在地チェック。
  - 選択 → `switchTenant(tenantId)` server action（membership 検証 → `user.tenantId`/`hasFullTenantAccess` 更新）→ `router.refresh()`。
- モバイルはコンパクト表示（塾名を省略表示）。

## 5. 権限の見え方
- 切替ドロップダウン各行にアクセス範囲・owner を明示。
- 設定画面のメンバー一覧（`getTenantInvites`）はアクティブ塾の membership ベースに（表示は現状踏襲）。
- `createTenantInvite`: **他塾に居ても招待可**。同塾の重複は unique で防止。`accept` で membership 追加。
- `removeMember`: membership 削除（User は消さない）。アクティブ塾を消した場合は別 membership に自動切替。**最後の1所属は削除不可**（決定事項③）。
- `assertActiveTenant`: アクティブ塾の status を見る（現状維持）。切替先が PENDING/SUSPENDED なら従来の案内画面。

## 6. セキュリティ（テナント分離の維持）
- `switchTenant` / `getCurrentUser` は **`user.tenantId ∈ memberships` を厳密検証**（任意テナントへの成りすまし防止）。ここが唯一の新経路なので厳格化。
- 既存クエリは `user.tenantId` フィルタ継続 → 分離の仕組みは不変。
- 限定アクセスは **アクティブ membership の `hasFullTenantAccess`** を用いる。`StudentMentorAccess` は塾内生徒にのみ効くので整合。

## 7. ロールアウト & ロールバック
- **Phase 2a**: schema push + backfill（挙動不変。membership は作るだけで未使用）。
- **Phase 2b**: getCurrentUser / 切替UI / 招待変更をデプロイ。
- ロールバック: 2b を戻すだけ（membership は残置で無害）。

## 8. 要決定（3点）
1. **owner 判定**: `ownerEmail` 継続（推奨）＋ membership は `hasFullTenantAccess` のみ。owner フラグは getCurrentUser で算出。
2. **招待受諾時のアクティブ塾**: 現状維持（推奨。トーストで「◯◯塾に参加しました。切替はヘッダーから」）。
3. **最後の1所属の削除**: 不可（推奨。UIで無効化）。
