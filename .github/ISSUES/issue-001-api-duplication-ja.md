# リファクタリング: APIルートの認証・エラーハンドリングの重複コード（約1,200行）

## 問題の概要

`app/api/`配下の30以上のAPIルートで、認証とエラーハンドリングのコードが重複しており、約1,200行の冗長なコードが存在します。

## 現在の状況

各APIルートファイルに以下の重複が含まれています：

- 認証チェックの重複（ファイルあたり5-10行）
- エラーハンドリングパターンの重複（ファイルあたり10-15行）
- レスポンスフォーマットの重複（ファイルあたり5-10行）

### 影響を受けるファイル

- `app/api/requirements/generate-system/route.ts`
- `app/api/requirements/generate-parts/route.ts`
- `app/api/requirements/generate-requirements/route.ts`
- `app/api/search/route.ts`
- `app/api/parts/route.ts`
- その他25以上のAPIルートファイル

## 提案する解決策

### 1. ミドルウェアシステムの作成

```typescript
// app/api/_middleware/auth.ts
export async function withAuth(handler: NextApiHandler) {
  return async (req: NextRequest) => {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || !isValidApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req);
  };
}
```

### 2. エラーハンドラーの作成

```typescript
// app/api/_middleware/errorHandler.ts
export function withErrorHandling(handler: NextApiHandler) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('API Error:', error);
      return handleApiError(error);
    }
  };
}
```

### 3. ルートのリファクタリング

```typescript
// 変更前: 50行
// 変更後: 15行
export const POST = withAuth(
  withErrorHandling(async (req) => {
    const data = await req.json();
    const result = await processRequest(data);
    return NextResponse.json(result);
  }),
);
```

## 期待される効果

- **コード削減**: 約1,200行 → 約100行
- **保守性向上**: 認証・エラー処理ロジックの一元管理
- **一貫性**: 全エンドポイントで統一されたエラーレスポンス
- **テスト容易性**: ミドルウェアを一度テストすれば全体に適用可能

## 実装優先度

**高** - API全体に影響し、保守性を大幅に改善します

## ラベル

- refactoring
- technical-debt
- api
- performance
