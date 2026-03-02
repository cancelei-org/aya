#!/bin/bash

echo "🗑️ Phase 2: Removing old duplicated files..."

# 古い互換性チェッカーファイルを削除
rm -f utils/connections/validation/compatibilityChecker.ts
rm -f utils/connections/validation/enhancedCompatibilityChecker.ts
echo "✅ Removed old compatibility checker files"

# 古いUIユーティリティファイルを削除
rm -f utils/ui/uiHelpers.ts
rm -f utils/ui/uiUtils.ts
echo "✅ Removed old UI utility files"

# 作業用スクリプトを削除
rm -f update-compatibility-imports.sh
rm -f update-ui-imports.sh
rm -f fix-*.sh
rm -f update-imports.sh
echo "✅ Removed temporary scripts"

echo "🎉 Phase 2 cleanup completed!"