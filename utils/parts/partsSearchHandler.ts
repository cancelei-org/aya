// 部品検索処理専用ハンドラー
import {
  generateInstanceName,
  handleComponentAddition,
} from '../components/componentNaming';
import type { NodeData, ChatMessage } from '@/types';
import type { Node } from '@xyflow/react';

// 検索結果の型定義
interface SearchResult {
  partName: string;
  modelNumber: string;
  description: string;
  specifications: Record<string, unknown>;
  estimatedPrice: number;
  category: string;
  purchaseSites?: Array<{ url: string }>;
}

// 部品検索処理のメイン関数
export const handleSearchParts = async (
  query: string,
  partType: string | undefined,
  setIsAnalyzing: (analyzing: boolean) => void,
  setLlmStatus: (status: { isRunning: boolean; currentTask: string }) => void,
  setCanvasNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>,
  nodes: Node<NodeData>[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
) => {
  setIsAnalyzing(true);
  setLlmStatus({ isRunning: true, currentTask: 'Searching for parts...' });

  try {
    const response = await fetch('/api/search-parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, partType }),
    });

    if (!response.ok) {
      console.warn(
        `Parts search failed: ${response.status} ${response.statusText}`,
      );
      // エラーログを出力するが処理は継続
      return;
    }

    const data = await response.json();

    if (data.searchResults && data.searchResults.length > 0) {
      // 検索結果を発注リストに追加
      const newParts = data.searchResults.map(
        (result: SearchResult, index: number) => ({
          id: `search-${Date.now()}-${index}`,
          partName: result.partName,
          modelNumber: result.modelNumber,
          estimatedOrderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          orderStatus: 'Unordered' as const,
          purchaseSiteLink: result.purchaseSites?.[0]?.url || '',
          description: result.description,
          specifications: result.specifications,
          estimatedPrice: result.estimatedPrice,
          category: result.category,
        }),
      );

      let addedCount = 0;
      const newComponents: Node<NodeData>[] = [];

      // 新しいシステム: スマートインスタンス管理
      setCanvasNodes((prevNodes) => {
        const updatedNodes = [...prevNodes];

        newParts.forEach((newPart) => {
          const quantity = newPart.quantity || 1;

          // 数量に応じてインスタンスを作成
          for (let i = 0; i < quantity; i++) {
            // コンポーネント追加の処理を決定
            const additionResult = handleComponentAddition(
              newPart.partName,
              newPart.modelNumber,
              updatedNodes,
              quantity,
            );

            if (
              additionResult.action === 'create_new' ||
              additionResult.action === 'add_instance'
            ) {
              // インスタンス名の決定
              let instanceName: string;
              if (quantity === 1) {
                instanceName = newPart.partName; // 数量1: 大本名
              } else {
                // 数量2+: 既存のタイトルを考慮してインスタンス名生成
                const existingTitles = updatedNodes.map((c) => c.title);
                instanceName = generateInstanceName(
                  newPart.partName,
                  existingTitles,
                );
              }

              // 新しいコンポーネントインスタンスを作成
              const newComponent: Node<NodeData> = {
                id: `comp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'customNode',
                position: { x: 100 + addedCount * 50, y: 100 + addedCount * 50 },
                data: {
                  title: instanceName,
                  type: 'primary' as const,
                  inputs: 1,
                  outputs: 1,
                  basePartId: additionResult.basePartId,
                  instanceName: instanceName,
                  // 発注リスト用の必須フィールド追加
                  modelNumber: newPart.modelNumber,
                  orderStatus: 'Unordered' as const,
                  estimatedOrderDate: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000,
                  )
                    .toISOString()
                    .split('T')[0],
                  purchaseSiteLink: newPart.purchaseSiteLink || '',
                  quantity: 1,
                  description:
                    newPart.description || `Search result: ${newPart.partName}`,
                  voltage:
                    newPart.specifications?.voltage ||
                    newPart.specifications?.Voltage ||
                    '',
                  communication:
                    newPart.specifications?.communication ||
                    newPart.specifications?.Communication ||
                    newPart.specifications?.Interface ||
                    '',
                },
              };

              updatedNodes.push(newComponent);
              newComponents.push(newComponent);
              addedCount++;
              console.log(
                `✅ Added instance ${i + 1}/${quantity}: ${instanceName}`,
              );
            } else {
              console.log(`🔄 Skipping duplicate part: ${newPart.partName}`);
              break; // 重複の場合は残りのインスタンスもスキップ
            }
          }
        });

        return updatedNodes;
      });

      // 部品情報はcanvasNodes内で管理（partOrders統合処理削除）
      console.log('✅ 部品情報は新しいcanvasNodes内で自動管理されます');
      console.log('🗑️ PBS構造も自動生成されるため手動更新は不要です');

      // 検索結果をチャットに表示（実際の追加数を反映）
      const searchResultMessage = `Parts search results: ${data.searchResults.length} parts found, ${addedCount} new parts added to the order list.`;
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content: searchResultMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  } catch (error) {
    console.warn('Parts search error (non-critical):', error);
    // エラーをログに出力するが、ユーザーには通知しない（メインチャット機能に影響しないため）
  } finally {
    setIsAnalyzing(false);
    setLlmStatus({ isRunning: false, currentTask: '' });
  }
};

// 検索結果の後処理ユーティリティ
interface ProcessedPart extends SearchResult {
  id: string;
  estimatedOrderDate: string;
  orderStatus: 'Unordered';
  purchaseSiteLink: string;
  quantity?: number;
}

export const processSearchResults = (
  searchResults: SearchResult[],
  nodes: Node<NodeData>[],
): {
  newParts: ProcessedPart[];
  componentInstances: Node<NodeData>[];
} => {
  const newParts = searchResults.map((result, index) => ({
    id: `search-${Date.now()}-${index}`,
    partName: result.partName,
    modelNumber: result.modelNumber,
    estimatedOrderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    orderStatus: 'Unordered' as const,
    purchaseSiteLink: result.purchaseSites?.[0]?.url || '',
    description: result.description,
    specifications: result.specifications,
    estimatedPrice: result.estimatedPrice,
    category: result.category,
  }));

  const componentInstances: Node<NodeData>[] = [];

  newParts.forEach((newPart) => {
    const quantity = newPart.quantity || 1;

    for (let i = 0; i < quantity; i++) {
      const additionResult = handleComponentAddition(
        newPart.partName,
        newPart.modelNumber,
        nodes,
        quantity,
      );

      if (
        additionResult.action === 'create_new' ||
        additionResult.action === 'add_instance'
      ) {
        const instanceName =
          quantity === 1
            ? newPart.partName
            : generateInstanceName(
                newPart.partName,
                nodes.map((c) => c.data?.title || ''),
              );

        componentInstances.push({
          id: `comp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'customNode',
          position: { x: 0, y: 0 },
          data: {
            title: instanceName,
            instanceName,
            basePartId: additionResult.basePartId,
            modelNumber: newPart.modelNumber,
            description:
              newPart.description || `Search result: ${newPart.partName}`,
            voltage: newPart.specifications?.voltage || '',
            communication: newPart.specifications?.communication || '',
          },
        });
      }
    }
  });

  return { newParts, componentInstances };
};
