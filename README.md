# 人間が1行も書かないタスク管理アプリケーション

これは[Next.js](https://nextjs.org)を使用した、[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)でブートストラップされたプロジェクトです。

## はじめに

### Supabaseのセットアップ

このプロジェクトは認証とデータベースサービスにSupabaseを使用しています。開発サーバーを起動する前に、ローカルのSupabaseサービスを起動する必要があります：

```bash
# Supabaseサービスを起動
npm run supabase:start

# その後、Next.js開発サーバーを起動
npm run dev
```

または、両方を一度に起動するコマンドを使用することもできます：

```bash
npm run dev:with-supabase
```

利用可能なSupabaseコマンドの詳細については、[Supabaseコマンドドキュメント](./docs/supabase_commands.md)を参照してください。

### 開発サーバー

Next.js開発サーバーのみを実行するには：

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

ブラウザで[http://localhost:3000](http://localhost:3000)を開くと結果が表示されます。

`app/page.tsx`を変更することでページの編集を開始できます。ファイルを編集すると、ページは自動的に更新されます。

このプロジェクトは[`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)を使用して、Vercelの新しいフォントファミリーである[Geist](https://vercel.com/font)を自動的に最適化して読み込みます。

## プロジェクト構造

このプロジェクトは以下を使用するSaaSアプリケーションです：

- フロントエンドに**Next.js（Appルーター）**
- 認証とデータベースサービスに**Supabase**
- データベーススキーマ管理とマイグレーションに**Prisma**

### 主要ディレクトリ

- `/app` - Next.jsアプリケーションコード
  - `/app/components` - Reactコンポーネント
  - `/app/lib` - ユーティリティ関数とライブラリ
  - `/app/types` - TypeScript型定義
- `/prisma` - Prismaスキーマとマイグレーション
- `/supabase` - Supabase設定
- `/docs` - プロジェクトドキュメント

## データベース管理

このプロジェクトはデータベースサービスにSupabaseを、スキーマ管理にPrismaを使用しています：

1. **Supabase**はPostgreSQLデータベースと認証サービスを提供
2. **Prisma**はデータベーススキーマ定義とマイグレーションに使用

データベースを変更する場合：

1. `prisma/schema.prisma`でPrismaスキーマを更新
2. `npm run supabase:migration:new`を使用してマイグレーションを作成
3. `npm run supabase:migration:up`でマイグレーションを適用
4. `npm run supabase:types`で更新されたTypeScript型を生成

## 詳細情報

Next.jsについて詳しく学ぶには、以下のリソースをご覧ください：

- [Next.jsドキュメント](https://nextjs.org/docs) - Next.jsの機能とAPIについて学ぶ
- [Learn Next.js](https://nextjs.org/learn) - インタラクティブなNext.jsチュートリアル

[Next.jsのGitHubリポジトリ](https://github.com/vercel/next.js)もチェックできます - フィードバックと貢献を歓迎します！

## Vercelへのデプロイ

Next.jsアプリをデプロイする最も簡単な方法は、Next.jsの作成者によるプラットフォーム[Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)を使用することです。

詳細については、[Next.jsデプロイドキュメント](https://nextjs.org/docs/app/building-your-application/deploying)をご覧ください。
