# Issue: 接続データ形式の標準化

## 概要
プロジェクト内で接続（Connection）データの形式が統一されておらず、2つの異なる形式が混在している。

## 現状

### 1. 独自形式（fromId/toId）
```typescript
interface Connection {
  fromId: string
  toId: string
  fromPort: string
  toPort: string
}
```
**使用箇所：**
- `/components/canvas/MainCanvas.tsx` - 接続の検証
- `/components/parts/PartsManagementLogic.tsx` - 接続のフィルタリング
- `/hooks/useAutoSave.ts` - ハッシュ生成
- `/types/canvas.ts` - 型定義
- 各種テストファイル

### 2. React Flow標準形式（source/target）
```typescript
interface Edge {
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
}
```
**使用箇所：**
- `/components/canvas/SystemDiagramFlow.tsx` - React FlowのaddEdge
- `/lib/ai/softwarePromptGenerator.ts` - AIプロンプト生成
- `/test-system-generation.js` - テスト表示

### 3. 混在箇所
- `/hooks/useSystemGenerationStream.ts` - 両方の形式が混在
- `/utils/parts/partsConnectionProcessor.ts` - 最近の修正で混乱

## 問題点
1. **データ変換のオーバーヘッド** - 形式間の変換処理が必要
2. **バグリスク** - 変換漏れによる接続線の非表示
3. **メンテナンス性低下** - どちらの形式を使うべきか不明確
4. **新規開発者の混乱** - 2つの形式の存在理由が不明

## 影響範囲
- 接続線が表示されない問題（現在発生中）
- 保存時に`connectionsCount: 0`となる問題
- React Flowのアップデート時の互換性問題

## 推奨解決策

### React Flow形式への統一
**理由：**
1. React Flowが中核ライブラリであり、その標準に合わせるべき
2. 長期的なメンテナンス性の向上
3. React Flowのドキュメント・サンプルがそのまま使える
4. 将来的なアップデートへの対応が容易

### 移行計画

#### Phase 1: 互換性層の追加（短期）
```typescript
interface Connection {
  // 既存のプロパティ
  fromId: string
  toId: string
  fromPort: string
  toPort: string
  // React Flow互換プロパティを追加
  source?: string
  target?: string
  sourceHandle?: string
  targetHandle?: string
}
```

#### Phase 2: 段階的移行（中期）
1. 新規コードはReact Flow形式で記述
2. 既存コードを優先度順にリファクタリング
   - 高: SystemDiagramFlow周辺
   - 中: MainCanvas、接続処理
   - 低: テストコード

#### Phase 3: 完全移行（長期）
1. 独自形式のプロパティを非推奨化
2. 型定義をReact Flow形式に統一
3. 変換層の削除

## 必要な作業

### 即座に必要な修正
1. `partsConnectionProcessor.ts`の形式を決定
2. 接続が保存されない問題の解決

### 段階的な改善
1. Connection型に両形式のプロパティを追加
2. ユーティリティ関数の作成（形式変換）
3. 各コンポーネントの段階的移行
4. テストの更新
5. ドキュメントの整備

## 優先度
**High** - 現在のシステムの動作に影響があるため

## 関連Issue
- ノードサイズの調整（解決済み）
- カテゴリノードの表示問題（解決済み）

## 作成日
2024-12-20

## ステータス
Open