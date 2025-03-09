# タスク分析・インサイト機能 技術設計書

## 概要
本ドキュメントでは、タスク分析・インサイト機能の技術的な設計と実装方法について詳細に記述します。この機能は、ユーザーのタスク管理パターンや生産性に関する洞察を提供し、データに基づいた意思決定と生産性向上を支援するものです。

## アーキテクチャ概要
タスク分析・インサイト機能は、以下の主要コンポーネントで構成されます：

1. **データ収集層**：ユーザーのタスク活動データを収集・保存
2. **データ処理層**：収集したデータを分析・集計
3. **API層**：処理したデータをフロントエンドに提供
4. **UI層**：データを視覚化し、ユーザーに提示

## データモデル

### 新規モデル

#### TaskActivity
タスクの状態変化や活動を記録するモデル

```prisma
model TaskActivity {
  id          Int      @id @default(autoincrement())
  taskId      Int
  userId      String
  action      String   // created, updated, status_changed, deleted
  oldStatus   String?  // 状態変更の場合の変更前の状態
  newStatus   String?  // 状態変更の場合の変更後の状態
  timestamp   DateTime @default(now())

  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([userId])
  @@index([timestamp])
}
```

#### ProductivityGoal
ユーザーの生産性目標を管理するモデル

```prisma
model ProductivityGoal {
  id          Int      @id @default(autoincrement())
  userId      String
  title       String
  targetValue Int      // 目標値（例：完了タスク数）
  currentValue Int     @default(0) // 現在の達成値
  startDate   DateTime
  endDate     DateTime
  type        String   // daily_tasks, weekly_tasks, completion_rate など
  status      String   @default("active") // active, completed, failed
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

#### AnalyticsPreference
ユーザーの分析設定を保存するモデル

```prisma
model AnalyticsPreference {
  userId                String  @id
  dataCollectionEnabled Boolean @default(true)
  defaultTimeRange      String  @default("week") // day, week, month, year
  dashboardLayout       Json?   // ダッシュボードのカスタムレイアウト設定

  user                  User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 既存モデルの拡張

#### Task
タスクモデルに分析関連のフィールドを追加

```prisma
model Task {
  // 既存フィールド...

  startedAt    DateTime?  // タスクの作業開始時間
  completedAt  DateTime?  // タスクの完了時間

  activities   TaskActivity[]
}
```

## API設計

### 1. ダッシュボードデータAPI

#### リクエスト
```
GET /api/analytics/dashboard
Query Parameters:
  - timeRange: 'day' | 'week' | 'month' | 'year'
Headers:
  - Authorization: Bearer {token}
```

#### レスポンス
```json
{
  "taskSummary": {
    "total": 25,
    "completed": 15,
    "inProgress": 5,
    "todo": 5,
    "overdue": 2
  },
  "completionRate": 0.6,
  "tasksByProject": [
    {
      "projectId": 1,
      "projectName": "プロジェクトA",
      "taskCount": 10,
      "completedCount": 6
    },
    // ...
  ],
  "tasksByTag": [
    {
      "tagId": 1,
      "tagName": "緊急",
      "tagColor": "#ff0000",
      "taskCount": 5,
      "completedCount": 3
    },
    // ...
  ],
  "recentActivities": [
    {
      "id": 1,
      "taskId": 5,
      "taskTitle": "デザインレビュー",
      "action": "status_changed",
      "timestamp": "2025-03-08T10:30:00Z"
    },
    // ...
  ]
}
```

### 2. 生産性分析API

#### リクエスト
```
GET /api/analytics/productivity
Query Parameters:
  - timeRange: 'day' | 'week' | 'month' | 'year'
  - groupBy: 'hour' | 'day' | 'week' | 'month'
Headers:
  - Authorization: Bearer {token}
```

#### レスポンス
```json
{
  "productivityByTime": [
    {
      "timeSlot": "9:00",
      "taskCount": 5,
      "completionRate": 0.8
    },
    // ...
  ],
  "productivityByDay": [
    {
      "day": "月曜日",
      "taskCount": 8,
      "completionRate": 0.75
    },
    // ...
  ],
  "completionTrend": [
    {
      "date": "2025-03-01",
      "completedTasks": 3,
      "createdTasks": 5
    },
    // ...
  ],
  "averageCompletionTime": 2.5,
  "tagEfficiency": [
    {
      "tagId": 1,
      "tagName": "緊急",
      "tagColor": "#ff0000",
      "completionRate": 0.9,
      "averageCompletionTime": 1.2
    },
    // ...
  ],
  "projectEfficiency": [
    {
      "projectId": 1,
      "projectName": "プロジェクトA",
      "completionRate": 0.7,
      "averageCompletionTime": 3.1
    },
    // ...
  ]
}
```

### 3. タスク予測・推奨API

#### リクエスト
```
GET /api/analytics/predictions
Headers:
  - Authorization: Bearer {token}
```

#### レスポンス
```json
{
  "recommendedTasks": [
    {
      "id": 5,
      "title": "デザインレビュー",
      "priority": 3,
      "estimatedCompletionTime": 1.5,
      "dueDate": "2025-03-10",
      "score": 85
    },
    // ...
  ],
  "workloadForecast": [
    {
      "date": "2025-03-09",
      "estimatedHours": 6.5,
      "scheduledTasks": 4
    },
    // ...
  ],
  "similarTasks": [
    {
      "taskId": 3,
      "title": "ワイヤーフレーム作成",
      "completionTime": 2.3,
      "tags": [
        {
          "id": 2,
          "name": "デザイン",
          "color": "#00ff00"
        }
      ]
    },
    // ...
  ]
}
```

### 4. レポート生成API

#### リクエスト
```
GET /api/analytics/reports
Query Parameters:
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD
  - type: 'productivity' | 'project' | 'team'
  - format: 'json' | 'csv'
  - projectId: number (optional, for project reports)
Headers:
  - Authorization: Bearer {token}
```

#### レスポンス
レポートデータ（JSON形式）またはCSVファイル

### 5. 活動記録API

#### リクエスト
```
POST /api/analytics/activities
Headers:
  - Authorization: Bearer {token}
Body:
{
  "taskId": 5,
  "action": "status_changed",
  "oldStatus": "TODO",
  "newStatus": "IN_PROGRESS"
}
```

#### レスポンス
```json
{
  "id": 123,
  "taskId": 5,
  "userId": "user-id",
  "action": "status_changed",
  "oldStatus": "TODO",
  "newStatus": "IN_PROGRESS",
  "timestamp": "2025-03-09T15:30:00Z"
}
```

### 6. 設定管理API

#### リクエスト（設定取得）
```
GET /api/analytics/preferences
Headers:
  - Authorization: Bearer {token}
```

#### レスポンス
```json
{
  "dataCollectionEnabled": true,
  "defaultTimeRange": "week",
  "dashboardLayout": {
    // カスタムレイアウト設定
  }
}
```

#### リクエスト（設定更新）
```
PUT /api/analytics/preferences
Headers:
  - Authorization: Bearer {token}
Body:
{
  "dataCollectionEnabled": true,
  "defaultTimeRange": "month",
  "dashboardLayout": {
    // カスタムレイアウト設定
  }
}
```

## フロントエンド実装

### コンポーネント構成

1. **AnalyticsDashboard**
   - メインのダッシュボード表示コンポーネント
   - サブコンポーネントの切り替え管理

2. **MetricCard**
   - 主要指標を表示するカードコンポーネント
   - 数値と変化率を表示

3. **AnalyticsChart**
   - Chart.jsを使用したグラフ表示コンポーネント
   - 様々なチャートタイプ（棒グラフ、円グラフ、折れ線グラフなど）をサポート

4. **TimeRangeSelector**
   - 時間範囲選択コンポーネント
   - 日次/週次/月次/年次の切り替え

5. **ProductivityAnalysis**
   - 生産性分析画面コンポーネント
   - 時間帯別・曜日別の生産性表示

6. **TaskPrediction**
   - タスク予測・推奨画面コンポーネント
   - 推奨タスクリスト表示

7. **AnalyticsReports**
   - レポート生成画面コンポーネント
   - レポート設定と表示

### 状態管理

- React Hooksを使用した状態管理
- 各コンポーネントで必要なデータをAPIから取得
- 共通データはコンテキストで共有

### データ取得フロー

1. コンポーネントのマウント時にAPIからデータを取得
2. ローディング状態を表示
3. データ取得完了後、表示を更新
4. エラー発生時、エラーメッセージを表示

### レスポンシブデザイン

- モバイル対応のレイアウト
- グリッドシステムを使用した柔軟なレイアウト
- 画面サイズに応じたコンポーネント表示の最適化

## バックエンド実装

### データ収集

1. **タスク状態変更の追跡**
   - タスクの状態変更時にTaskActivityレコードを作成
   - ユーザーアクションを記録

2. **タスク完了時間の計算**
   - タスクのステータスが「完了」に変更された時点で完了時間を記録
   - 開始時間から完了時間までの差分を計算

### データ集計

1. **効率的なクエリ**
   - インデックスを活用した高速クエリ
   - 複雑な集計はバックグラウンドジョブで事前計算

2. **キャッシュ戦略**
   - 頻繁に使用されるデータをキャッシュ
   - 定期的なキャッシュ更新

### セキュリティ

1. **認証・認可**
   - すべてのAPIエンドポイントでJWTトークン認証
   - ユーザー自身のデータのみアクセス可能

2. **データ保護**
   - センシティブなデータの暗号化
   - 適切なデータアクセス制御

## パフォーマンス最適化

### データベース最適化

1. **インデックス設計**
   - 頻繁に使用されるクエリに対するインデックス
   - 複合インデックスの活用

2. **クエリ最適化**
   - 効率的なJOINの使用
   - 不要なデータ取得の回避

### API最適化

1. **ページネーション**
   - 大量のデータを返す場合はページネーションを実装
   - カーソルベースのページネーション

2. **部分的なデータ取得**
   - 必要なフィールドのみを返すクエリパラメータ
   - ネストされたデータの選択的取得

### フロントエンド最適化

1. **遅延読み込み**
   - 画面外のコンポーネントの遅延読み込み
   - 大きなチャートの遅延初期化

2. **メモ化**
   - 計算コストの高い処理の結果をメモ化
   - 不要な再レンダリングの防止

## テスト戦略

### ユニットテスト

1. **APIエンドポイントのテスト**
   - 各エンドポイントの入出力検証
   - エラーハンドリングのテスト

2. **データ処理ロジックのテスト**
   - 集計ロジックの正確性検証
   - エッジケースの処理確認

### 統合テスト

1. **フロントエンド・バックエンド連携テスト**
   - APIとUIの連携確認
   - データフローの検証

2. **エンドツーエンドテスト**
   - ユーザーシナリオに基づくテスト
   - 実際のユーザー体験の検証

## デプロイ戦略

### マイグレーション計画

1. **データベースマイグレーション**
   - 新規テーブルの作成
   - 既存テーブルの拡張

2. **既存データの移行**
   - 必要に応じて既存データから活動履歴を生成
   - データの整合性確保

### フィーチャーフラグ

1. **段階的なロールアウト**
   - フィーチャーフラグを使用した機能の段階的な有効化
   - ユーザーグループごとの機能提供

2. **A/Bテスト**
   - 異なるUI/UXバリエーションのテスト
   - ユーザーフィードバックの収集

## 監視とメンテナンス

### パフォーマンスモニタリング

1. **APIレスポンス時間の監視**
   - エンドポイントごとのレスポンス時間追跡
   - パフォーマンス低下の早期検出

2. **データベース負荷の監視**
   - クエリパフォーマンスの追跡
   - インデックス使用状況の確認

### エラー追跡

1. **エラーログの収集**
   - フロントエンド・バックエンドのエラーログ収集
   - エラーパターンの分析

2. **ユーザーフィードバック**
   - 問題報告の収集
   - ユーザー体験の継続的改善

## 今後の拡張性

### AIの統合

1. **機械学習モデルの導入**
   - タスク完了時間予測の精度向上
   - ユーザー行動パターンの学習

2. **自然言語処理**
   - タスク内容の自動分類
   - 類似タスクの検出

### 外部サービス連携

1. **カレンダー連携**
   - カレンダーアプリとのデータ同期
   - スケジュール最適化提案

2. **通知システム**
   - インサイトに基づく通知
   - 生産性向上のためのリマインダー

## 結論

タスク分析・インサイト機能は、ユーザーの生産性向上を支援する重要な機能です。本設計書に基づいて実装することで、ユーザーに価値のある洞察を提供し、アプリケーションの競争力を高めることができます。また、将来的な拡張性も考慮した設計となっており、AIや外部サービス連携などの機能追加も容易に行えます。
