# GitHub Issue: Unify node components

## タイトル
Unify node components: Remove CategoryNode and consolidate into SystemNode

## ラベル
- refactoring
- bug

## 現状の問題

現在、カテゴリノードの実装が2つのコンポーネントに分かれており、混乱と不具合の原因になっています。

### 問題点
- **SystemNode内のSpatialCategoryNode**と**CategoryNode**が重複して存在
- 実際には`type: 'systemNode'`のみ使用され、CategoryNodeは未使用
- 自動カテゴライズ機能が正しく動作しない（memberNodesの更新が反映されない）
- どちらのコンポーネントを使うべきか不明確

### 現在の実装状況

#### SystemNode (`components/nodes/SystemNode.tsx`)
- React Flowネイティブのノードコンポーネント
- `nodeType === 'category'`の場合、SpatialCategoryNodeをレンダリング
- NodeResizerでリサイズ（React Flow純正）
- インライン編集機能あり

#### CategoryNode (`components/nodes/CategoryNode.tsx`) 
- Rndライブラリを使用（React-Resizable-and-Draggable）
- 独自のドラッグ＆リサイズシステム
- **実際には使用されていない**

## 提案する解決策

### 1. CategoryNodeコンポーネントの削除
- `components/nodes/CategoryNode.tsx`を削除
- 不要な依存関係（react-rnd）の削除も検討

### 2. SystemNode内のSpatialCategoryNodeに全機能を統合
- memberNodesの更新が正しく反映されるよう修正
- 必要に応じてonCategoryMove/onCategoryResizeコールバックを追加

### 3. 単一のノードシステムで統一
- `type: 'systemNode'`のみ使用
- `nodeType`プロパティで表示を切り替え（'part' | 'category'）

## タスクリスト

- [ ] CategoryNodeコンポーネントの削除
- [ ] SystemDiagramFlow.tsxからcategoryNodeタイプの登録を削除  
- [ ] SpatialCategoryNodeのmemberNodes更新問題を修正
- [ ] 必要に応じてonCategoryMove/onCategoryResizeコールバックを追加
- [ ] 関連するインポート文の削除
- [ ] テストと動作確認

## 期待される効果

- **コードベースのシンプル化**: 重複実装の削除
- **メンテナンス性の向上**: 単一の実装を保守
- **自動カテゴライズ機能の修正**: memberNodesが正しく更新される
- **混乱の解消**: どのコンポーネントを使うか明確になる

## 関連する問題

- 自動カテゴライズが機能しない（リロードが必要）
- カテゴリのメンバー数が即座に更新されない

## 技術的詳細

### 削除対象ファイル
- `components/nodes/CategoryNode.tsx`

### 修正対象ファイル
- `components/nodes/SystemNode.tsx` - SpatialCategoryNodeの改善
- `components/canvas/SystemDiagramFlow.tsx` - nodeTypes定義の更新
- `components/canvas/MainCanvas.tsx` - CategoryNode関連のインポート削除

### 影響範囲
- 既存のプロジェクトデータには影響なし（すでに`type: 'systemNode'`を使用）
- React Flowとの統合がよりシンプルになる