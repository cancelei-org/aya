# React Developer Tools での Props 確認方法

## 1. React Developer Tools のインストール

### Chrome の場合
1. [Chrome Web Store](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) にアクセス
2. 「Add to Chrome」をクリック
3. インストール完了後、ブラウザを再起動

### Firefox の場合
1. [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/) にアクセス
2. 「Add to Firefox」をクリック
3. インストール完了後、ブラウザを再起動

## 2. AppLayout の Props を確認する手順

### ステップ 1: アプリケーションを開く
```bash
# 開発サーバーを起動
npm run dev

# ブラウザで開く
http://localhost:3000
```

### ステップ 2: Developer Tools を開く
- **Windows/Linux**: `F12` または `Ctrl + Shift + I`
- **Mac**: `Cmd + Option + I`

### ステップ 3: React タブを選択
Developer Tools に「⚛️ Components」と「⚛️ Profiler」タブが追加されています。
「⚛️ Components」タブをクリックします。

### ステップ 4: AppLayout コンポーネントを探す

#### 方法1: 検索を使う
1. Components タブの上部にある検索ボックス（🔍）をクリック
2. "AppLayout" と入力
3. 検索結果から AppLayout を選択

#### 方法2: ツリーを辿る
```
HomePage
  └── Suspense
      └── AppLayout  ← これを選択
          ├── TopBar
          ├── Sidebar
          ├── MainCanvas
          └── ChatPanel
```

### ステップ 5: Props を確認

AppLayout を選択すると、右側のパネルに Props が表示されます：

#### ✅ 修正後（現在）の表示
```
AppLayout
  props
    session: {…}
    onRequirementsApproval: ƒ
```
**Props数: 2個のみ** ✨

#### ❌ 修正前の表示（以前）
```
AppLayout
  props
    chatLimit: {…}
    currentProject: {…}
    isProcessing: false
    isSaving: false
    session: {…}
    activeTab: "canvas"
    setActiveTab: ƒ
    canUndo: false
    canRedo: false
    onUndo: ƒ
    onRedo: ƒ
    selectedTreeItem: null
    editingItemId: null
    editingValue: ""
    expandedSections: {…}
    setSelectedTreeItem: ƒ
    setEditingItemId: ƒ
    setEditingValue: ƒ
    setExpandedSections: ƒ
    ... (126個のprops)
```

## 3. ビジュアル確認用のスクリーンショット位置

![React DevTools Location](./react-devtools-guide.png)

1. **Components タブ**: 上部のタブバーにある
2. **コンポーネントツリー**: 左側のパネル
3. **Props表示**: 右側のパネル
4. **検索ボックス**: 上部にある虫眼鏡アイコン

## 4. コンソールでの確認（代替方法）

React Developer Tools が使えない場合、ブラウザのコンソールで確認：

```javascript
// ブラウザのコンソールで実行
// React Fiber ツリーを確認（開発環境のみ）
const getFiberProps = () => {
  const root = document.getElementById('__next');
  const key = Object.keys(root).find(key => key.startsWith('__react'));
  if (key) {
    let fiber = root[key];
    while (fiber) {
      if (fiber.elementType?.name === 'AppLayout') {
        console.log('AppLayout Props:', Object.keys(fiber.memoizedProps));
        console.log('Props count:', Object.keys(fiber.memoizedProps).length);
        return fiber.memoizedProps;
      }
      fiber = fiber.child || fiber.sibling || fiber.return;
    }
  }
  return null;
};

getFiberProps();
```

## 5. 確認ポイントチェックリスト

### AppLayout の Props 確認
- [ ] React Developer Tools をインストール
- [ ] Components タブを開く
- [ ] AppLayout コンポーネントを選択
- [ ] Props パネルで以下を確認：
  - [ ] `session` prop が存在
  - [ ] `onRequirementsApproval` prop が存在
  - [ ] **合計2個のPropsのみ** ✅
  - [ ] 他の124個のPropsが削除されている ✅

### その他のコンポーネント確認
- [ ] **TopBar**: Props なし（ストア直接参照）
- [ ] **Sidebar**: session prop のみ
- [ ] **ChatPanel**: Props なし（ストア直接参照）
- [ ] **MainCanvas**: activeTab, onRequirementsApproval の2個のみ

## 6. トラブルシューティング

### React Developer Tools が表示されない場合

1. **拡張機能が有効か確認**
   - Chrome: `chrome://extensions/`
   - Firefox: `about:addons`

2. **開発モードか確認**
   ```bash
   # 本番ビルドでは表示されません
   npm run dev  # ✅ 開発モード（表示される）
   npm run build && npm start  # ❌ 本番モード（表示されない）
   ```

3. **React がロードされているか確認**
   ```javascript
   // コンソールで実行
   console.log(window.React ? 'React loaded' : 'React not found');
   ```

### Props が多く表示される場合

古いキャッシュが原因の可能性：

```bash
# キャッシュをクリア
rm -rf .next
npm run dev
```

ブラウザのキャッシュもクリア：
- Chrome: `Ctrl/Cmd + Shift + R`
- Firefox: `Ctrl/Cmd + Shift + R`

## まとめ

React Developer Tools を使用することで、以下が確認できます：

1. **AppLayout の Props 数**: 126個 → 2個 ✅
2. **子コンポーネントの Props**: 大幅削減 ✅
3. **ストア直接参照への移行**: 完了 ✅

これにより、状態管理の改善が視覚的に確認できます。