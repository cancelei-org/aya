# パフォーマンス改善: SystemNode.tsxコンポーネントの分割（1,611行）

## 問題の概要

`components/nodes/SystemNode.tsx`が1,611行の巨大なコンポーネントとなっており、以下の問題を引き起こしています：

- 不必要な再レンダリング
- メモリ使用量の増加
- 開発時のビルド速度低下
- コードの可読性・保守性の低下

## 現在の状況

### パフォーマンスへの影響

- **再レンダリング**: プロパティの一部が変更されただけで全体が再レンダリング
- **バンドルサイズ**: 単一ファイルで約50KB（圧縮前）
- **初期読み込み**: コンポーネント全体の解析に時間がかかる

### コード構造の問題

- 複数の責務が混在（表示、状態管理、イベント処理、アニメーション）
- 20以上の内部関数とフック
- 複雑な条件分岐とネストした構造

## 提案する解決策

### 1. コンポーネントの分割

```typescript
// components/nodes/SystemNode/index.tsx - メインコンポーネント（~200行）
// components/nodes/SystemNode/NodeHeader.tsx - ヘッダー部分（~150行）
// components/nodes/SystemNode/NodePorts.tsx - ポート管理（~200行）
// components/nodes/SystemNode/NodeContent.tsx - コンテンツ表示（~300行）
// components/nodes/SystemNode/NodeControls.tsx - 操作ボタン（~150行）
// components/nodes/SystemNode/hooks/useNodeState.ts - 状態管理（~200行）
// components/nodes/SystemNode/hooks/useNodeAnimation.ts - アニメーション（~150行）
// components/nodes/SystemNode/utils/nodeHelpers.ts - ユーティリティ（~250行）
```

### 2. メモ化の適用

```typescript
// 各サブコンポーネントにReact.memoを適用
export const NodeHeader = React.memo(
  ({ title, status, onEdit }) => {
    // ヘッダーロジック
  },
  (prevProps, nextProps) => {
    // カスタム比較ロジック
    return (
      prevProps.title === nextProps.title &&
      prevProps.status === nextProps.status
    );
  },
);
```

### 3. 状態管理の最適化

```typescript
// useReducerを使用して状態更新を最適化
const [state, dispatch] = useReducer(nodeReducer, initialState);

// コンテキストAPIで深いプロップ伝達を回避
const NodeContext = createContext();
```

## 期待される効果

- **パフォーマンス向上**: 再レンダリング時間を約60%削減
- **開発体験の改善**: ホットリロード速度の向上
- **保守性の向上**: 各コンポーネントが単一責任原則に従う
- **テスト容易性**: 分割されたコンポーネントの個別テストが可能

## 実装計画

1. **Phase 1**: ユーティリティ関数の抽出
2. **Phase 2**: カスタムフックの分離
3. **Phase 3**: UIコンポーネントの分割
4. **Phase 4**: メモ化とパフォーマンス最適化

## 実装優先度

**高** - ユーザー体験に直接影響し、開発効率も改善します

## ラベル

- performance
- refactoring
- react
- frontend
