# タスクタグ機能 技術設計書

## 概要
この技術設計書は、タスクタグ管理機能の実装に関する技術的な詳細を記述しています。PRDに基づき、データモデル、API設計、フロントエンド実装の詳細を定義します。

## データモデル

既存のデータモデルを活用します：

```prisma
model Tag {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  color     String    @default("#3498db")
  tasks     TaskTag[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model TaskTag {
  taskId    Int
  task      Task     @relation(fields: [taskId], references: [id])
  tagId     Int
  tag       Tag      @relation(fields: [tagId], references: [id])
  createdAt DateTime @default(now())

  @@id([taskId, tagId])
}
```

## APIエンドポイント設計

### 1. タグ管理API

#### GET /api/tags
- 説明: ユーザーのタグ一覧を取得
- レスポンス: タグオブジェクトの配列
```typescript
{
  id: number;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  }
}[]
```

#### POST /api/tags
- 説明: 新しいタグを作成
- リクエストボディ:
```typescript
{
  name: string;
  color: string;
}
```
- レスポンス: 作成されたタグオブジェクト

#### PUT /api/tags
- 説明: 既存のタグを更新
- リクエストボディ:
```typescript
{
  id: number;
  name: string;
  color: string;
}
```
- レスポンス: 更新されたタグオブジェクト

#### DELETE /api/tags?id={tagId}
- 説明: タグを削除
- クエリパラメータ: `id` - 削除するタグのID
- レスポンス: 204 No Content

### 2. タスクタグ関連API

#### GET /api/tasks/tags?taskId={taskId}
- 説明: 特定のタスクに付与されたタグを取得
- クエリパラメータ: `taskId` - タスクのID
- レスポンス: タグオブジェクトの配列

#### POST /api/tasks/tags
- 説明: タスクにタグを付与
- リクエストボディ:
```typescript
{
  taskId: number;
  tagId: number;
}
```
- レスポンス: 201 Created

#### DELETE /api/tasks/tags?taskId={taskId}&tagId={tagId}
- 説明: タスクからタグを削除
- クエリパラメータ: `taskId` - タスクのID, `tagId` - タグのID
- レスポンス: 204 No Content

#### GET /api/tasks?tags={tagIds}
- 説明: 特定のタグが付与されたタスクを取得
- クエリパラメータ: `tags` - カンマ区切りのタグID
- レスポンス: タスクオブジェクトの配列

## フロントエンド実装

### 1. 新規コンポーネント

#### TagManager.tsx
- 説明: タグの作成・編集・削除を行うコンポーネント
- 主な機能:
  - タグ一覧の表示
  - 新規タグ作成フォーム
  - タグの編集・削除機能

#### TagSelector.tsx
- 説明: タスク作成/編集時にタグを選択するコンポーネント
- 主な機能:
  - 利用可能なタグの表示
  - 複数タグの選択機能
  - 選択されたタグのプレビュー表示

#### TagFilter.tsx
- 説明: タグによるタスクのフィルタリングを行うコンポーネント
- 主な機能:
  - タグによるフィルタリング
  - 複数タグの組み合わせによるフィルタリング
  - アクティブなフィルターの表示

#### TagBadge.tsx
- 説明: タグを視覚的に表示するコンポーネント
- 主な機能:
  - タグ名と色の表示
  - 削除可能なバッジ表示（オプション）

### 2. 既存コンポーネントの修正

#### TaskManager.tsx
- 修正内容:
  - タグフィルターコンポーネントの追加
  - タスク一覧にタグバッジの表示
  - タスクフィルタリングロジックの追加

#### TaskForm（タスク作成/編集フォーム）
- 修正内容:
  - タグセレクターコンポーネントの追加
  - タグ情報の送信処理の追加

### 3. 状態管理

- タグ一覧の状態管理
- 選択されたタグの状態管理
- フィルタリングされたタスクの状態管理

## 実装手順

### フェーズ1: バックエンド実装
1. タグ関連のAPIエンドポイント実装
   - `/api/tags` エンドポイントの実装（GET, POST, PUT, DELETE）
   - `/api/tasks/tags` エンドポイントの実装（GET, POST, DELETE）
   - タグによるタスクフィルタリング機能の実装

2. データベースクエリの最適化
   - タグによるフィルタリングのクエリ最適化
   - 必要に応じたインデックスの追加

### フェーズ2: フロントエンド実装
1. タグ管理UIの実装
   - `TagManager.tsx` コンポーネントの実装
   - `TagBadge.tsx` コンポーネントの実装

2. タスク作成/編集画面のタグ選択UI実装
   - `TagSelector.tsx` コンポーネントの実装
   - `TaskManager.tsx` の修正

### フェーズ3: フィルタリング機能実装
1. タグによるフィルタリング機能の実装
   - `TagFilter.tsx` コンポーネントの実装
   - フィルタリングロジックの実装

2. UIの調整とバグ修正
   - コンポーネント間の連携テスト
   - スタイルの調整

### フェーズ4: テストとデプロイ
1. 機能テスト
   - 各機能の単体テスト
   - 統合テスト

2. ユーザーフィードバックの収集
   - テストユーザーによる評価
   - フィードバックに基づく調整

3. 本番環境へのデプロイ
   - マイグレーションの実行
   - 機能のリリース

## セキュリティ考慮事項
- タグ操作は認証済みユーザーのみ許可
- ユーザーは自分のタグのみ操作可能
- タグ名の長さ制限とバリデーション

## パフォーマンス考慮事項
- タグによるフィルタリングのクエリパフォーマンス最適化
- タグ数が多い場合のUI表示の最適化
- キャッシュ戦略の検討

## 今後の拡張性
- タグの階層構造（親子関係）の追加
- タグの自動提案機能
- タグベースの分析・レポート機能
