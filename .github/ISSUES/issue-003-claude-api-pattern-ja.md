# リファクタリング: Claude API呼び出しパターンの統一（Opus→Sonnetフォールバック）

## 問題の概要

複数のファイルでClaude APIのOpus→Sonnetフォールバックパターンが重複実装されており、以下の問題があります：

- 同じエラーハンドリングロジックの重複
- APIキー管理の不統一
- レート制限処理の重複実装

## 現在の状況

### 影響を受けるファイル

- `app/api/requirements/generate-system/route.ts`
- `app/api/requirements/generate-parts/route.ts`
- `app/api/requirements/generate-requirements/route.ts`
- `lib/anthropic.ts`
- その他のAPI呼び出し箇所

### 重複パターンの例

```typescript
// 各ファイルで同じパターンが繰り返されている
try {
  // Opus APIを試行
  const response = await anthropic.messages.create({
    model: MODELS.OPUS,
    // ...設定
  });
} catch (error) {
  // Sonnetにフォールバック
  const response = await anthropic.messages.create({
    model: MODELS.SONNET,
    // ...同じ設定
  });
}
```

## 提案する解決策

### 1. 統一APIクライアントの作成

```typescript
// lib/claudeClient.ts
export class ClaudeAPIClient {
  private retryCount = 0;
  private maxRetries = 3;

  async callWithFallback(params: MessageParams): Promise<Response> {
    try {
      // Opusを試行
      return await this.callOpus(params);
    } catch (error) {
      if (this.shouldFallbackToSonnet(error)) {
        // Sonnetにフォールバック
        return await this.callSonnet(params);
      }
      throw error;
    }
  }

  private shouldFallbackToSonnet(error: any): boolean {
    return (
      error.status === 429 || // レート制限
      error.status === 503 || // サービス利用不可
      error.message?.includes('overloaded')
    );
  }
}
```

### 2. レート制限の統一処理

```typescript
// lib/rateLimit.ts
export class RateLimiter {
  private queue: Map<string, Promise<any>[]> = new Map();

  async execute<T>(model: string, operation: () => Promise<T>): Promise<T> {
    await this.waitForSlot(model);
    try {
      return await operation();
    } finally {
      this.releaseSlot(model);
    }
  }
}
```

### 3. エラーハンドリングの統一

```typescript
// lib/errorHandlers.ts
export function handleClaudeAPIError(error: any): ErrorResponse {
  if (error.status === 401) {
    return { error: 'Invalid API key', code: 'AUTH_ERROR' };
  }
  if (error.status === 429) {
    return { error: 'Rate limit exceeded', code: 'RATE_LIMIT' };
  }
  // その他のエラー処理
}
```

## 期待される効果

- **コード削減**: 約500行の重複コードを削除
- **一貫性**: 全てのAPI呼び出しで同じ挙動を保証
- **保守性**: フォールバックロジックの変更が一箇所で可能
- **監視性**: API使用状況の一元的な監視が可能
- **コスト最適化**: Opus/Sonnetの使用率を適切に管理

## 実装計画

1. **Step 1**: 統一APIクライアントクラスの作成
2. **Step 2**: 既存のAPI呼び出しをリファクタリング
3. **Step 3**: エラーハンドリングとレート制限の統合
4. **Step 4**: 使用状況のログとメトリクス追加

## 追加の考慮事項

- Railway環境変数との互換性維持
- 既存のAPIレスポンス形式の保持
- 段階的な移行のためのアダプターパターン

## 実装優先度

**中** - APIコストとパフォーマンスに影響しますが、機能的には動作しています

## ラベル

- refactoring
- api
- claude
- cost-optimization
