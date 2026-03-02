# トラブルシューティングガイド

## よくある問題と解決方法

### 1. Octopart APIが動作しない

**症状:**
- 価格情報が「N/A」と表示される
- 購入リンクが生成されない
- コンソールに「Octopart API is not properly configured」と表示される

**原因:**
APIキーの有効期限が切れているか、無効です。

**解決方法:**
1. APIキーの有効期限を確認する：
   ```bash
   # ブラウザのコンソールで実行
   const token = process.env.NEXT_PUBLIC_OCTOPART_API_KEY
   const payload = JSON.parse(atob(token.split('.')[1]))
   console.log(new Date(payload.exp * 1000))
   ```

2. 期限切れの場合、[Octopart](https://octopart.com/api/register)から新しいAPIキーを取得

3. 環境変数を更新：
   ```bash
   NEXT_PUBLIC_OCTOPART_API_KEY=your-new-api-key
   ```

4. 開発サーバーを再起動

### 2. 注文リストに電圧/通信データが表示されない

**症状:**
- 電圧欄が空欄になる
- 通信フォーマットが表示されない
- 部品名とリンクのみが表示される

**原因:**
AI仕様抽出がこれらのフィールドを正しく取得できていません。

**解決方法:**
1. AIデバッグモードを有効にして生の応答を確認：
   ```typescript
   aiService.setDebugMode(true)
   ```

2. AIプロンプトに電圧/通信要件が含まれているか確認

3. 重要な部品には手動で仕様を追加：
   ```typescript
   const manualSpecs = {
     'Arduino Uno': { voltage: '5V', communication: 'I2C,SPI,UART' },
     'ESP32': { voltage: '3.3V', communication: 'I2C,SPI,UART,WiFi,BT' }
   }
   ```

### 3. 承認/却下ボタンが表示されない

**症状:**
- チャットで追加した部品に承認ボタンが表示されない
- AI提案の部品を承認・却下できない

**原因:**
チャット追加部品の承認状態が正しく初期化されていません。

**解決方法:**
1. 部品に適切な初期状態があることを確認：
   ```typescript
   const newComponent = {
     ...componentData,
     needsApproval: true,
     isApproved: false
   }
   ```

2. MainCanvasがSystemNodeに承認ハンドラーを渡しているか確認

3. SystemNodeでボタンのレンダリング条件を確認

### 4. Reactの状態更新警告

**症状:**
- コンソール警告: "Cannot update a component while rendering"
- アクション後にUIが更新されない

**原因:**
レンダリング中の状態更新、または古いクロージャの参照です。

**解決方法:**
1. 状態更新にコールバックを使用：
   ```typescript
   setNodes(prevNodes => 
     prevNodes.map(node => 
       node.id === nodeId ? { ...node, data: newData } : node
     )
   )
   ```

2. useCallbackフックに適切な依存関係を追加

3. 必要に応じてReact Flowの更新を強制：
   ```typescript
   const instance = useReactFlow()
   instance.fitView()
   ```

### 5. 多数の部品でパフォーマンスが低下

**症状:**
- 50個以上の部品で描画が遅い
- ノードをドラッグする時のラグ
- CPU使用率が高い

**解決方法:**
1. コンポーネントにReact.memoを有効化：
   ```typescript
   export const SystemNode = React.memo(({ data, id }) => {
     // コンポーネントのコード
   })
   ```

2. 大きなリストには仮想化を実装

3. 状態更新をバッチ処理：
   ```typescript
   unstable_batchedUpdates(() => {
     setNodes(newNodes)
     setEdges(newEdges)
   })
   ```

### 6. 接続線の視覚的な問題

**症状:**
- 電源線と信号線が同じに見える
- 接続アニメーションがない
- 線が混乱して重なる

**原因:**
カスタムエッジタイプが正しく登録またはレンダリングされていません。

**解決方法:**
1. カスタムエッジタイプを登録：
   ```typescript
   const edgeTypes = {
     powerConnection: PowerConnectionEdge,
     signalConnection: SignalConnectionEdge
   }
   ```

2. エッジタイプが正しく設定されていることを確認：
   ```typescript
   const edge = {
     ...baseEdge,
     type: isPowerConnection ? 'powerConnection' : 'signalConnection'
   }
   ```

### 7. AI検索のタイムアウト

**症状:**
- 「AI検索がタイムアウトしました」エラー
- 部品検索時の長い遅延
- 不完全な検索結果

**解決方法:**
1. タイムアウト設定を増やす：
   ```typescript
   const result = await aiService.search(component, {
     timeout: 60000 // 60秒
   })
   ```

2. プログレッシブローディングを実装：
   ```typescript
   // 部分的な結果を順次表示
   aiService.on('partialResult', (partial) => {
     updateUI(partial)
   })
   ```

3. 一般的な部品にはキャッシングを使用

### 8. ポート制限違反

**症状:**
- ポートにこれ以上部品を接続できない
- 「ポート容量を超えました」警告
- 接続数が正しくない

**原因:**
ポート制限が適切に強制または追跡されていません。

**解決方法:**
1. 接続前にポート容量を確認：
   ```typescript
   if (limitManager.checkConnectionLimit(port, currentConnections)) {
     // 接続を許可
   }
   ```

2. 接続を正確に追跡：
   ```typescript
   const connections = edges.filter(e => 
     e.source === nodeId && e.sourceHandle === portId
   )
   ```

### 9. キャッシュ関連の問題

**症状:**
- 古いデータが表示される
- 変更がすぐに反映されない
- 時間とともにメモリ使用量が増加

**解決方法:**
1. 必要に応じてキャッシュをクリア：
   ```typescript
   await cacheService.clear('ai-specs:*')
   ```

2. キャッシュの有効期限を実装：
   ```typescript
   const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7日
   ```

3. キャッシュサイズを監視：
   ```typescript
   const stats = cacheService.getStats()
   if (stats.size > MAX_CACHE_SIZE) {
     cacheService.prune()
   }
   ```

### 10. オフラインモードが動作しない

**症状:**
- オフライン時にアプリがクラッシュする
- データがローカルに保存されない
- 再接続時の同期失敗

**解決方法:**
1. オフライン機能を有効化：
   ```typescript
   import { offlineCapabilityManager } from '@/utils/offlineCapability'
   
   // オフライン同期のために操作を保存
   await offlineCapabilityManager.saveOperation(type, resource, data)
   ```

2. ネットワーク状態を処理：
   ```typescript
   const { isOnline } = useOfflineCapability()
   
   if (!isOnline) {
     showOfflineIndicator()
   }
   ```

3. 適切な同期を実装：
   ```typescript
   // オンライン復帰時に同期
   window.addEventListener('online', async () => {
     await offlineCapabilityManager.syncPendingOperations()
   })
   ```

## デバッグツール

### デバッグモードを有効化

```typescript
// ブラウザコンソールで実行
localStorage.setItem('orboh-debug', 'true')
window.location.reload()
```

### パフォーマンスプロファイリング

```typescript
// プロファイリング開始
performance.mark('operation-start')

// ... 操作のコード ...

// プロファイリング終了
performance.mark('operation-end')
performance.measure('operation', 'operation-start', 'operation-end')

// 結果を取得
const measure = performance.getEntriesByName('operation')[0]
console.log(`操作には ${measure.duration}ms かかりました`)
```

### 状態の検査

```typescript
// React DevToolsコンソールで
$r.state // 現在のコンポーネント状態
$r.props // 現在のコンポーネントプロパティ
```

## ヘルプを得る

ここに記載されていない問題に遭遇した場合：

1. ブラウザコンソールで詳細なエラーメッセージを確認
2. より詳細なログのためにデバッグモードを有効化
3. [GitHub Issues](https://github.com/orboh/orboh/issues)で問題を報告
4. 以下を含める：
   - 再現手順
   - 期待される動作
   - 実際の動作
   - ブラウザ/環境情報
   - 関連するエラーメッセージ

## よくある質問

### Q: APIキーはどこで取得できますか？
A: OpenAI APIキーは[OpenAI](https://platform.openai.com)から、Octopart APIキーは[Octopart](https://octopart.com/api/register)から取得できます。

### Q: なぜ部品の仕様が取得できないのですか？
A: AI検索は部品が十分に文書化されている場合に最も効果的です。一般的でない部品は手動で仕様を入力する必要があるかもしれません。

### Q: パフォーマンスを改善するには？
A: React.memoを使用し、大きなリストには仮想化を実装し、不必要な再レンダリングを避けてください。

### Q: データはどこに保存されますか？
A: データはローカルストレージとオプションでクラウド同期に保存されます。重要なプロジェクトは定期的にバックアップしてください。