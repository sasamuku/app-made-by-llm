# タスクステータス列挙型の実装

## 概要

本ドキュメントでは、タスク管理アプリケーションにおけるタスクステータスの管理方法を改善するために実施した、列挙型 (Enum) への移行について説明します。この変更は、`docs/tech-design/03_future_development_plan.md` で示された「タスク管理全般の改善」の一環として実施されました。

## 背景と目的

従来のタスク管理システムでは、タスクのステータスを文字列型 (`String`) で管理していました。これには以下の問題がありました：

1. 任意の文字列が設定可能であり、一貫性の確保が難しい
2. タイプミスや予期しない値が入る可能性がある
3. ステータスの追加・変更時にスキーマ変更が必要ない（型安全性の欠如）

これらの問題を解決し、より堅牢なタスク管理システムを構築するために、タスクステータスを列挙型に移行することにしました。

## 実装内容

### 1. Prismaスキーマの変更

`prisma/schema.prisma` に `TaskStatus` 列挙型を追加し、`Task` モデルの `status` フィールドの型を変更しました。

```prisma
enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

model Task {
  // 他のフィールド...
  status      TaskStatus @default(TODO)
  // 他のフィールド...
}
```

### 2. マイグレーションの実行

以下のコマンドでマイグレーションを実行し、データベーススキーマを更新しました：

```bash
npx prisma migrate dev --name add-task-status-enum
```

このマイグレーションにより、既存の文字列型のステータスフィールドが削除され、新しい列挙型のフィールドが作成されました。

### 3. API層の対応

フロントエンドとの互換性を確保するため、`app/api/tasks/route.ts` のPOST/PUT処理において、フロントエンドから送信される文字列値を適切な列挙型値に変換するロジックを追加しました：

```typescript
const data = await request.json();
let { title, description, status, priority, dueDate, projectId, tagIds } = data;
if (status === "in-progress") {
  status = "IN_PROGRESS";
} else if (status === "todo") {
  status = "TODO";
} else if (status === "done") {
  status = "DONE";
}
```

### 4. フロントエンド側の更新

`app/components/TaskManager.tsx` のフォームとタスク表示部分を更新し、新しい列挙型の値を使用するように変更しました：

```typescript
// フォームのセレクトボックス
<select
  id="status"
  name="status"
  value={newTask.status}
  onChange={handleInputChange}
>
  <option value="TODO">未着手</option>
  <option value="IN_PROGRESS">進行中</option>
  <option value="DONE">完了</option>
</select>

// タスク表示部分
<span className={`${styles.taskStatus} ${styles[task.status]}`}>
  {task.status === 'TODO' ? '未着手' :
   task.status === 'IN_PROGRESS' ? '進行中' : '完了'}
</span>
```

また、初期値やリセット値も `TODO` に統一しました。

## 技術的考慮点

### 1. 既存データの移行

今回のマイグレーションでは、既存の `status` フィールドが削除され、新しいフィールドが作成されるため、既存のデータが失われる可能性がありました。本番環境では、以下のような対策が必要です：

- 既存データのバックアップ
- 文字列値から列挙型値へのマッピングロジックの実装
- 段階的なマイグレーション（一時的に両方のフィールドを保持するなど）

### 2. フロントエンドとの整合性

フロントエンドとバックエンドの間でデータ形式の不一致が発生しないよう、以下の対策を講じました：

- API層での変換処理の追加
- フロントエンドコンポーネントの更新
- 将来的には、共有型定義の導入を検討

## 今後の展望

1. **ステータスの拡張**：
   - 必要に応じて、より詳細なステータス（例：`BLOCKED`, `REVIEW`, `ARCHIVED`など）を追加することが可能です。

2. **ステータス遷移の制御**：
   - 特定のステータスからのみ遷移可能なルールを実装することで、より厳密なワークフロー管理が可能になります。

3. **ステータスに基づいた機能拡張**：
   - ステータスに応じた通知機能
   - ステータス変更履歴の記録
   - ステータスベースのフィルタリング機能の強化

## 結論

タスクステータスの列挙型への移行により、タスク管理システムの型安全性と拡張性が向上しました。この変更は、`docs/tech-design/03_future_development_plan.md` で示された「タスク管理全般の改善」の重要なステップであり、今後のさらなる機能拡張の基盤となります。
