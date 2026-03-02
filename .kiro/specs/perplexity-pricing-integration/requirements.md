# Requirements Specification

## Overview
Perplexity API統合による電子部品のリアルタイム価格取得システム。既存のOctopart API（期限切れ）およびモックデータシステムを置き換え、正確な市場価格、在庫状況、配送情報を提供する。ORBOHの部品管理機能を強化し、ユーザーに最新の市場価格と調達情報を提供することで、より精度の高いプロジェクト計画と予算策定を可能にする。

## Requirements

### Requirement 1: API基盤の構築
**User Story:** ハードウェア開発者として、電子部品の最新価格情報を取得したいので、正確な予算計画を立てることができる

#### Acceptance Criteria
1. WHEN PERPLEXITY_API_KEY環境変数が正しく設定されている THEN API経由でリアルタイム価格検索が実行される
2. WHEN APIキーが未設定または無効な場合 THEN モックデータを返してシステムが継続動作する。モックデータであることがUIで分かるようにする
3. WHEN API呼び出しが失敗した場合 THEN エラーログを記録し、フォールバック機能が動作する
4. WHEN 環境変数が.env.localに設定される THEN プロダクションキーと開発キーが分離される
5. WHEN perplexityApi.tsモジュールが作成される THEN octopartApi.tsと同じインターフェースを実装する

### Requirement 2: データ抽出と構造化
**User Story:** ハードウェア開発者として、部品の価格・在庫・配送情報を一元的に取得したいので、調達計画を効率的に立てることができる

#### Acceptance Criteria
1. WHEN 部品名が入力される THEN Perplexity APIが主要サプライヤー（Digi-Key、Mouser、Newark、RS Components、AliExpress、Amazon）から価格を検索する
2. WHEN 検索結果が返される THEN 価格、在庫状況、MOQ、サプライヤー名、配送日数が抽出される
3. WHEN 複数の価格が見つかる THEN 最大5つの価格オプションが価格順にソートされて表示される
4. IF 価格情報が見つからない場合 THEN モックデータを生成して表示する。モックデータであることはUIで表示する
5. WHEN 価格データが抽出される THEN 全ての価格がUSD通貨に正規化される
6. WHEN 在庫状況が検出される THEN "in_stock"、"limited"、"out_of_stock"のいずれかに分類される
7. WHEN MOQ情報が取得される THEN 数値として正しく解析され保存される
8. IF 価格データの形式が不正な場合 THEN バリデーションエラーとしてログに記録される
9. WHEN 価格検索が実行される THEN 各サプライヤーの標準配送日数がPerplexity APIから取得される
10. WHEN 在庫状況が確認される THEN 在庫ありの場合は標準配送日数、取り寄せの場合は延長日数が表示される
11. WHEN 複数の配送オプションがある THEN 標準配送、速達配送、エコノミー配送の日数が取得される
12. IF 配送情報が取得できない場合 THEN サプライヤーの標準配送日数（デフォルト値）を使用する
13. WHEN 配送日数が取得される THEN 営業日数として計算される
14. WHEN Perplexity APIへのプロンプトが構築される THEN 構造化されたJSON形式での出力を要求する

### Requirement 3: 既存システムとの統合
**User Story:** システム管理者として、既存のOctopart API実装を置き換えたいので、既存のUIコンポーネントが継続して動作する

#### Acceptance Criteria
1. WHEN 既存の`searchPartPricing`関数が呼び出される THEN Perplexity APIベースの実装が実行される
2. WHEN `MarketDataDisplay`コンポーネントが価格データを要求する THEN 新しいAPI経由のデータが表示される
3. WHEN `PartsManagementTable`が価格情報を表示する THEN リアルタイム価格が反映される
4. IF API統合でエラーが発生した場合 THEN 既存のUIは適切なエラーメッセージを表示する

### Requirement 4: パフォーマンス最適化
**User Story:** システム管理者として、APIの効率的な利用とレスポンス速度の向上を実現したいので、ユーザー体験を向上させコストを削減できる

#### Acceptance Criteria
1. WHEN 部品価格が検索される THEN 結果が24時間キャッシュに保存される
2. WHEN 同じ部品が24時間以内に再検索される THEN キャッシュされたデータが返される
3. WHEN キャッシュが期限切れになる THEN 自動的にAPIから最新データを取得する
4. IF キャッシュシステムでエラーが発生した場合 THEN 直接API呼び出しにフォールバックする
5. WHEN 複数部品の価格検索が要求される THEN 3部品ずつのバッチで並列処理される
6. WHEN バッチ処理が実行される THEN レート制限を回避するため、バッチ間に2秒の待機時間が設けられる
7. WHEN 一括検索が完了する THEN 全ての結果がMap形式で返される
8. IF バッチ処理中にエラーが発生した場合 THEN 他のバッチの処理は継続し、エラー部品のみモックデータで補完される

### Requirement 5: API使用量管理
**User Story:** システム管理者として、API使用料を監視・制御したいので、予算超過を防ぎ、持続可能なサービス運用を実現できる

#### Acceptance Criteria
1. WHEN API呼び出しが実行される THEN 使用量カウンターが更新される
2. WHEN 月間使用量が設定した閾値に達する THEN 管理者にアラート通知が送信される
3. WHEN 使用量上限に達した場合 THEN 新しいAPI呼び出しを制限し、キャッシュデータまたはモックデータを使用する
4. IF 使用量監視システムでエラーが発生した場合 THEN ログに記録し、API呼び出しは継続する
5. IF レート制限に達した場合 THEN 適切な待機時間を設けて再試行する

### Requirement 6: UI統合と購入リンク
**User Story:** ハードウェア開発者として、価格情報と購入リンクを統合されたUIで確認したいので、スムーズに部品を発注できる

#### Acceptance Criteria
1. WHEN 複数の価格オプションがある THEN サプライヤー別にタブまたはリストで整理して表示される
2. WHEN 価格データが更新される THEN 最終更新時刻が表示される
3. WHEN 配送情報と購入リンクが取得される THEN 統合されたビューで表示される
4. IF 価格データの取得中にエラーが発生した場合 THEN 適切なエラーメッセージとリトライボタンが表示される
5. WHEN Perplexity APIで価格検索が実行される THEN 各サプライヤーの商品ページURLが同時に抽出される
6. WHEN 価格データが取得される THEN 既存の`purchaseLinkGenerator.ts`を活用してフォールバック購入リンクが生成される
7. WHEN `integrateWithOctopartSuppliers`関数が呼び出される THEN Perplexity APIから取得したサプライヤー情報と統合される
8. WHEN 複数の購入先リンクが取得される THEN 優先度順（公式 > 正規代理店 > 汎用サイト）にソートされる
9. WHEN 部品名が標準化されていない場合 THEN `normalizeComponentName`関数で正規化してから処理される
10. WHEN 直接商品リンクが取得できない場合 THEN `getOctopartSupplierUrl`関数を使用して標準的な検索URLが代替生成される
11. WHEN 価格表示コンポーネントが更新される THEN 既存の`PurchaseLink`インターフェースと互換性が保たれる
12. IF リンクの有効性検証が可能な場合 THEN HTTPステータスチェックが実行される

### Requirement 7: 既存データ型の拡張
**User Story:** 開発者として、配送情報を含む拡張された価格データ型を使用したいので、新しい機能を適切に実装できる

#### Acceptance Criteria
1. WHEN TypeScript型定義が更新される THEN `ComponentPricingExtended`インターフェースにdeliveryDays: number, shippingLocation?: string, shippingCost?: numberが含まれる
2. WHEN 既存の`ComponentPricing`型が使用される THEN 後方互換性が維持される
3. WHEN 新しい型が使用される THEN TypeScriptコンパイラエラーが発生しない
4. IF 型定義に不整合がある場合 THEN ビルド時にエラーとして検出される
5. WHEN 型定義が作成される THEN types/parts.tsファイルに追加される