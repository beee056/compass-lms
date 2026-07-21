# 進路別出願ワークスペース — DB先行ロールアウト

この変更は新しいテーブル・列をアプリが起動直後から参照するため、**アプリを先にmasterへ出してはいけない**。

## 適用順

1. 現在の本番DBバックアップ／Neon restore pointを確認する。
2. Neonの検証用ブランチへ `prisma/schema.prisma` の追加型変更を適用する。
3. 検証用ブランチで `prisma validate`、`prisma generate`、`tsc --noEmit`、`pnpm build` を実行する。
4. 既存の生徒・大学・書類・マイルストーン件数が適用前後で変わっていないことを確認する。
5. 新規テーブル `UniversityResource`、`DocumentRevision`、`DocumentAIReview` が空で作成されていることを確認する。
6. 本番DBへ同じ追加型変更を適用する。削除・rename・NOT NULL化は行わない。
7. 本番DBで新規列・テーブルの存在を確認してから、アプリブランチをmasterへマージする。
8. デプロイ後、メンター／限定メンター／生徒でスモークテストする。

## 今回の追加型変更

- `Document`: `universityId`, `prompt`, `requirements`, `charLimit`
- `Milestone`: `sourceKind`, `sourceKey`, `deadlineRule`, `notes`
- 新規: `UniversityResource`, `DocumentRevision`, `DocumentAIReview`

すべてnullableまたはdefault付きで、既存行の削除はない。

## ロールバック

- アプリに問題がある場合は直前のVercelデプロイへ戻す。
- DBの追加列・追加テーブルは旧アプリから参照されないため、そのまま残す。障害対応中にdropしない。
- DB適用自体に問題がある場合のみ、Neonのrestore pointから復元する。アプリのデプロイ前なら利用者影響はない。

## 未実施チェック

- [ ] Neon検証用ブランチへの適用
- [ ] 適用前後の件数比較
- [ ] 本番DBへの追加型変更適用
- [ ] 本番スモークテスト
