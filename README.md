# 🤖 ORBOH - ハードウェア統合管理システム

**プロジェクト設計者・初心者向けガイド**

## 📋 このドキュメントについて

このREADMEは、プログラムが初心者の設計者の方向けに作成されています。環境のセットアップから基本的な使い方まで、分かりやすく説明します。

## 🎯 ORBOHとは？

**ORBOH**は、あらゆるハードウェア開発のための統合管理システムです。**AYA（AI-powered Hardware Assistant）**として、ハードウェア開発者の完全なデジタルパートナーを目指しています。

### 🏗️ 主な機能

- **📊 システム図作成**: 部品を視覚的に配置・接続（@xyflow/react）
- **🛒 部品管理**: 発注状況・価格・仕様の一元管理
- **🔧 互換性チェック**: 電圧・通信・電力の自動互換性分析
- **🤖 AIアシスタント**: OpenAI GPT-4による技術相談
- **💾 プロジェクト保存**: 自動保存システムによる即座データ保存・復元
- **📁 ファイルアップロード**: 画像・PDF・Excel対応
- **🔄 Undo/Redo機能**: Ctrl+Z/Y対応
- **📱 リサイズ可能UI**: 3パネル構成（PBS・メイン・チャット）
- **🔗 GitHub連携**: ソフトウェア互換性チェック
- **👑 プレミアム機能**: チャット制限・有料プラン対応

## i18n 対応　（国際化）

Google 翻訳になるべく対応する
　ただし動的な内容はGoogle翻訳に対応させないで、安定して利用できるようにする。

### 🎨 画面構成

```
┌─────────────────────────────────────────────────────────┐
│                    🔧 ORBOH                            │
├─────────────┬─────────────────────┬─────────────────────┤
│   📋 PBS    │    🎨 作業エリア    │   💬 AIチャット    │
│   構造管理   │                     │                     │
│             │  - システム図       │  - 技術相談         │
│  - カテゴリ  │  - 部品リスト       │  - 部品提案         │
│  - 階層表示  │  - 互換性チェック   │  - エラー解決       │
│             │  - 開発ログ         │                     │
└─────────────┴─────────────────────┴─────────────────────┘
```

---

## 🚀 環境セットアップ（初心者向け詳細手順）

### 📋 技術仕様

**フロントエンド:**

- **Next.js**: 15.2.4
- **React**: 19.0.0
- **TypeScript**: 5.x
- **Tailwind CSS**: 4.x
- **@xyflow/react**: 12.8.1（システム図・フローチャート）
- **@radix-ui**: モダンUIコンポーネント
- **react-resizable-panels**: リサイズ可能パネル

**バックエンド:**

- **PostgreSQL**: 13以上
- **Prisma**: 6.11.0（ORM）
- **NextAuth.js**: 認証システム
- **OpenAI API**: GPT-4チャット機能

**追加機能:**

- **multer**: ファイルアップロード（画像・PDF・Excel対応）
- **puppeteer**: Webスクレイピング
- **xlsx**: Excel処理

### ステップ1: 必要なソフトウェアのインストール

#### 1.1 Node.js のインストール

```bash
# ✅ Node.js 18以上が必要です（推奨: 20以上）
# https://nodejs.org/ からLTS版をダウンロード・インストール

# インストール確認
node --version   # v18.0.0 以上であることを確認
npm --version    # 自動でインストールされます
```

#### 1.2 PostgreSQL データベースのインストール

```bash
# 🗄️ PostgreSQL 13以上が必要です

# Windows の場合:
# https://www.postgresql.org/download/windows/
# インストーラーをダウンロードして実行

# Mac の場合:
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Linux の場合:
sudo apt update
sudo apt install postgresql postgresql-contrib

# インストール確認
psql --version   # PostgreSQL 13+ であることを確認
```

#### 1.3 Git のインストール（既にある場合はスキップ）

```bash
# 📥 Gitがまだない場合
# https://git-scm.com/downloads からダウンロード

# インストール確認
git --version
```

### ステップ2: プロジェクトの取得・セットアップ

#### 2.1 プロジェクトをローカルにコピー

```bash
# 📂 作業ディレクトリに移動（例: デスクトップ）
cd ~/Desktop

# プロジェクトをクローン（既にある場合はスキップ）
git clone [プロジェクトURL]
cd orboh

# または既存フォルダがある場合
cd [プロジェクトフォルダ名]
```

#### 2.2 必要なパッケージのインストール

```bash
# 📦 依存関係をインストール（時間がかかります）
npm install

# TypeScript型定義の生成
npx prisma generate

# 完了確認：エラーが出ないことを確認
# "added XXX packages" のようなメッセージが表示されればOK
```

### ステップ3: データベースの準備

#### 3.1 PostgreSQL データベースの作成

```bash
# 🗄️ PostgreSQLにログイン
psql -U postgres
# ログインできない場合
pspl pstgres

# データベース作成（PostgreSQL内で実行）
CREATE DATABASE orboh_dev;
CREATE USER orboh_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE orboh_dev TO orboh_user;

# 終了
\q
```

#### 3.2 環境変数ファイルの設定

```bash
# 📝 環境設定ファイルを作成
cp .env.local.example .env.local

# ⚡ 重要: .env.local ファイルを編集してください
```

**.env.local ファイルの内容例:**

```bash
# データベース接続情報
DATABASE_URL="postgresql://orboh_user:your_password@localhost:5432/orboh_dev"

# 認証用の秘密鍵（ランダムな文字列を生成）
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI API キー（AI機能を使う場合）
OPENAI_API_KEY="sk-proj-your-openai-api-key-here"

# Octopart API キー（部品価格・在庫確認 - オプション）
NEXT_PUBLIC_OCTOPART_API_KEY="your-octopart-api-key-here"
```

**🔑 重要な設定のヒント:**

- `your_password`: 上記で設定したPostgreSQLパスワード
- `your-secret-key-here`: 32文字以上のランダムな文字列（認証に必要）
- `your-openai-api-key-here`: OpenAI APIで取得したAPIキー（AI機能に必要）
- `your-octopart-api-key-here`: Octopart APIキー（部品価格確認用、任意）

### ステップ4: データベースの初期化

#### 4.1 データベーススキーマの作成

```bash
# 🏗️ データベーステーブルを作成
npm run db:setup

# もしくは
npx prisma migrate deploy
npx prisma generate

# 完了確認
npm run db:studio
# ブラウザでhttp://localhost:5555が開けばOK
```

### ステップ5: アプリケーションの起動

#### 5.1 開発サーバーの起動

```bash
# 🚀 アプリケーションを起動（高速Turbopack使用）
npm run dev
npx prisma dev

# 通常モード（Turbopackなし）
npm run dev:safe

# 成功メッセージ例:
# ▲ Next.js 15.2.4
# - Local:        http://localhost:3000
# - ready in 1.2s
```

#### 5.2 動作確認

```bash
# 🌐 ブラウザでアクセス
# http://localhost:3000

# ✅ 確認ポイント:
# - ログイン画面が表示される
# - エラーメッセージが出ない
# - レイアウトが正しく表示される
```

---

## 🎯 基本的な使い方

### 初回ログイン・プロジェクト作成

#### 1. アカウント作成

```
1. http://localhost:3000 にアクセス
2. "Sign In" ボタンをクリック
3. 新規アカウントを作成
4. メールアドレスで認証（開発環境では簡略化）
```

#### 2. 最初のプロジェクト

```
1. ログイン後、自動的にプロジェクトが作成されます
2. "システム図"、"部品管理"、"チャット" の3つのパネルが表示されます
3. 右クリックで部品を追加してみましょう
```

### 基本操作の流れ

#### システム図での部品追加

```
1. 中央の青いエリアで右クリック
2. "Add Node" を選択
3. 新しい部品ボックスが追加されます
4. ドラッグで位置を調整
5. 部品名をダブルクリックで編集
6. ノード間を線で接続（ドラッグ&ドロップ）
```

#### ファイルアップロード操作

```
1. チャットパネルの📎アイコンをクリック
2. 画像・PDF・Excelファイルを選択
3. プレビュー確認後、メッセージと一緒に送信
4. AIが自動的にファイル内容を解析
```

#### パネルリサイズ操作

```
1. パネル間の境界線にカーソルを合わせる
2. カーソルが「↔」に変わったらドラッグ
3. 作業に応じて最適なレイアウトに調整
4. 設定は自動保存されます
```

#### キーボードショートカット

```
- Ctrl+Z: Undo（元に戻す）
- Ctrl+Y: Redo（やり直し）
- Ctrl+S: 手動保存
- F5: ページリロード（データは保持）
```

#### 部品情報の登録

```
1. "Parts Management" タブをクリック
2. 追加した部品が一覧に表示されます
3. Description欄に部品の説明を入力
4. Voltage、Communication欄を選択
5. 変更は自動的に保存されます
```

#### AIアシスタントの活用

```
1. 右側のチャットパネルで質問を入力
2. "このサーボモーターの選び方を教えて"
3. "配線が正しいか確認して"
4. AIが技術的なアドバイスを提供
```

#### 互換性チェックの実行

```
1. "Parts Management" タブで部品情報を確認
2. "🔧 互換性チェック" ボタンをクリック
3. システムが自動で以下をチェック：
   - 電圧適合性（5V vs 3.3V の競合検出）
   - 通信プロトコル適合性（I2C、SPI、UART等）
   - 電力供給能力 vs 消費電力
4. 問題がある場合は詳細な推奨解決策を表示
5. スクロール可能なモーダルで結果を確認
```

---

## 🔧 トラブルシューティング

### よくある問題と解決法

#### 起動時のエラー

**📝 問題: "Module not found" エラー**

```bash
# 解決方法: 依存関係を再インストール
rm -rf node_modules
rm package-lock.json
npm install
```

**🗄️ 問題: データベース接続エラー**

```bash
# 解決方法: PostgreSQL起動確認
# Windows: サービスからPostgreSQLを開始
# Mac: brew services start postgresql@15
# Linux: sudo systemctl start postgresql

# 接続テスト
npm run db:studio
```

**🔑 問題: 認証エラー**

```bash
# 解決方法: .env.local ファイル確認
# NEXTAUTH_SECRET が設定されているか確認
# NEXTAUTH_URL="http://localhost:3000" になっているか確認
```

#### 使用時の問題

**💾 問題: データが保存されない**

```
原因: ブラウザのネットワーク接続の問題
解決: ブラウザをリロードしてデータが復元されるか確認
```

**🤖 問題: AIチャットが動かない**

```
原因1: OpenAI APIキーが未設定
解決: .env.local の OPENAI_API_KEY を確認

原因2: 使用制限に達している
解決: しばらく時間をおいてから再試行
```

**🔄 問題: 画面が重い・遅い**

```
原因: 大量のデータやメモリ不足
解決: ブラウザのリロード（F5）で改善することが多い
注意: リロード後もデータは自動保存されているため復元されます
```

**🔧 問題: 互換性チェックが動かない**

```
原因: 部品情報が不完全
解決: Voltage、Communication欄を全て入力してから再実行
```

**📊 問題: 互換性結果が見切れる**

```
原因: モーダル画面のスクロールが必要
解決: マウスホイールまたは縦スクロールバーで下までスクロール
```

**📁 問題: ファイルアップロードが失敗**

```
原因1: ファイルサイズが大きすぎる（制限: 10MB）
解決: ファイルサイズを確認・圧縮

原因2: サポートされていない形式
解決: PNG、JPG、PDF、Excel形式を使用
```

**⚡問題: Turbopackエラー**

```
原因: 新しいビルドシステムとの互換性問題
解決: npm run dev:safe で通常モードを使用
```

**📱 問題: パネルが正しく表示されない**

```
原因: ブラウザのキャッシュまたはレイアウト問題
解決: ブラウザをリロード（F5）、データは自動保存されています
```

**🔗 問題: GitHub連携エラー**

```
原因: GitHub API制限またはリポジトリアクセス権限
解決: しばらく時間をおいてから再試行、公開リポジトリを使用
```

### デバッグ情報の確認

#### 開発者向けデバッグコマンド

```bash
# データベース状態確認
npm run db:studio          # データベースGUIツール
npm run db:push           # スキーマ同期
npm run db:migrate        # マイグレーション実行

# ビルド・リント確認
npm run build             # 本番ビルドテスト
npm run lint              # ESLint実行

# ログ確認
npm run dev               # 開発サーバー（コンソールログ）
npm run dev:safe          # Turbopack無しモード

# API確認
curl http://localhost:3000/api/debug/check-db
curl http://localhost:3000/api/debug/project-data

# TypeScript型確認
npx prisma generate       # Prisma型生成
```

#### ブラウザでの確認方法

```
1. F12キーで開発者ツールを開く
2. "Console"タブでエラーメッセージを確認
3. "Network"タブでAPI通信状況を確認
4. エラーメッセージをコピーして開発者に相談
```

---

## 📊 システムの現状理解

### 開発フェーズの進捗

**✅ Phase 3 (現在): 統合完了 + 先進機能実装**

- partOrders削除完了 → canvasNodes統合済み
- 自動保存システム安定化（beforeunload/visibilitychange対応）
- AI チャット機能完全統合（OpenAI GPT-4）
- データベース設計最適化完了（PostgreSQL + Prisma）
- **🆕 実装済み先進機能:**
  - 互換性チェッカーシステム（電圧・通信・電力分析）
  - ファイルアップロード（画像・PDF・Excel対応）
  - リサイズ可能3パネルUI（react-resizable-panels）
  - Undo/Redo機能（Ctrl+Z/Y対応）
  - GitHub連携・ソフトウェア互換性チェック
  - プレミアム機能・チャット制限システム
  - Turbopack高速ビルド対応
  - TypeScript完全対応
  - 多言語対応基盤

**🚧 今後の予定:**

- Phase 4: 音声入力機能（Web Speech API）
- Phase 5: チーム協業機能（Socket.io、リアルタイム編集）
- Phase 6: データImport/Export（Eagle CAD、KiCad連携）
- Phase 7: マルチプロジェクト対応
- Phase 8: 役割別UI（エンジニア・マーケター・営業向け）
- Phase 9: ビジュアルAI統合（GPT-4 Vision、カメラ解析）
- Phase 10: 収益化システム（Stripe決済、サブスクリプション）

### データの保存場所と仕組み

```mermaid
graph TD
    A[ユーザー入力] --> B[React アプリケーション]
    B --> C[自動保存システム]
    C --> D[PostgreSQLデータベース]
    D --> E[プロジェクトデータ永続化]

    F[ページリロード] --> G[データベース読み込み]
    G --> H[画面復元]
```

**🎯 重要な理解ポイント:**

- **自動保存**: 変更は即座に自動保存されます
- **統合データ**: 部品の位置・詳細情報がcanvasNodesで統一管理
- **AI統合**: ハードウェア情報を自動でAIに送信して最適な回答を生成

---

## 💡 効果的な活用方法

### プロジェクト管理のベストプラクティス

#### 1. 段階的な部品登録

```
Step 1: システム図で大まかな構成を作成
Step 2: 各部品の詳細情報を順次入力
Step 3: 接続線で部品間の関係を明確化
Step 4: 互換性チェックで自動的な問題検出
Step 5: AIチャットで設計の妥当性を確認
Step 6: ファイルアップロードで仕様書・回路図を共有
Step 7: GitHub連携でソフトウェア互換性確認
```

#### 2. 効率的なUI活用

```
💡 パネルレイアウトのコツ:
- PBS（左）: プロジェクト構造管理に最適化
- メイン（中央）: 作業内容に応じてサイズ調整
- チャット（右）: AI相談時は大きく、設計時は小さく

⌨️ ショートカット活用:
- Ctrl+Z/Y: 誤操作時の素早い復旧
- Ctrl+S: 重要な変更時の手動保存
- F5: 動作が重い時のリフレッシュ

📁 ファイル管理:
- 仕様書: PDF形式でアップロード
- 回路図: 画像形式で視覚的共有
- 部品リスト: Excel形式で一括管理
```

#### 2. 効率的なAI活用

```
💬 良い質問例:
"このサーボモーターと制御ボードの組み合わせは適切ですか？"
"電圧5Vで動作する部品を教えてください"
"PWM通信でトルク20kg.cmのサーボモーターを推薦してください"

💬 互換性チェック活用例:
"互換性チェックで電圧不適合が出ました。5Vと3.3Vの部品を安全に接続する方法は？"
"通信プロトコルでI2CとSPIが競合していますが、どう解決すべきですか？"
"電力不足と表示されました。電源容量の計算方法を教えてください"

❌ 避けるべき質問:
"何かいい部品ある？"（曖昧すぎる）
"プログラム教えて"（専門範囲外）
```

#### 3. 互換性チェックの活用

```
🔧 設計検証のコツ:
- 部品追加後は必ず互換性チェックを実行
- 電圧不適合は最優先で解決（重要度：Critical）
- 通信プロトコルの対応状況を事前確認
- 電力供給能力の計算を自動化で効率アップ
```

#### 4. データの整理方法

```
📁 部品管理のコツ:
- Description: 具体的で分かりやすい説明
- Model Number: 正確な型番
- Order Status: こまめに更新
- Voltage/Communication: 互換性チェックに必須
- Notes: 重要な仕様や注意点を記録
```

### チーム内での活用

#### 情報共有の準備

```
🔄 Phase 5 (チーム機能) 実装後:
- 管理者・編集者・閲覧者の権限分離
- リアルタイム同期編集
- プロジェクトの読み取り専用共有

📤 Phase 6 (Import/Export) 実装後:
- .aya.json形式でのプロジェクト共有
- CSV形式での部品リスト出力
- 他CADツールとの連携
```

---

## 📞 サポート・連絡先

### 🔧 技術的な問題が発生した場合

1. **エラーメッセージの保存**: ブラウザのF12 → Consoleタブのエラーをコピー
2. **手順の記録**: 何をした時にエラーが発生したかを記録
3. **環境情報**: OS、ブラウザ、Node.jsバージョンを確認
4. **開発者への連絡**: 上記情報と一緒に報告

### 📚 更なる学習リソース

- **React**: https://react.dev/learn （UIフレームワーク）
- **Next.js**: https://nextjs.org/docs （Webアプリケーションフレームワーク）
- **PostgreSQL**: https://www.postgresql.org/docs/ （データベース）
- **TypeScript**: https://www.typescriptlang.org/docs/ （プログラミング言語）

---

## 🎯 まとめ

ORBOHは、あらゆるハードウェア開発における部品管理と設計を効率化する統合プラットフォームです。

**🔑 成功のポイント:**

- **段階的な使い方**: まずはシンプルな部品配置から始める
- **信頼性の高いデータ管理**: 自動保存によるデータの安全性
- **AI活用**: 具体的で明確な質問でAIアシスタントを活用
- **継続的な更新**: 部品情報や発注状況を最新に保つ

**🚀 将来の機能追加により、さらに強力な開発支援ツールに進化していきます！**

---

**📝 このドキュメントは設計者・初心者の方向けです。Claude Code開発者向けの技術詳細は `CLAUDE_CODE_GUIDE.md` をご参照ください。**# Database Migration Complete Fri Aug 1 02:45:54 PM PDT 2025
