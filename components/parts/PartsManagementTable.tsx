"use client"

import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, ExternalLink, Info } from "lucide-react"
import type { UnifiedPartInfo } from '@/utils/components/partsExtractor'
import type { CanvasNode } from '@/types'

interface PartsManagementTableProps {
  unifiedParts: UnifiedPartInfo[]
  updateTextField: (partId: string, field: keyof CanvasNode, value: string) => void
  updateSelectField: (partId: string, field: keyof CanvasNode, value: string) => void
  updatePriceField: (partId: string, value: string) => void
  updateOrderDateField: (partId: string, value: string) => void
  getLatestFieldValue: (part: UnifiedPartInfo, field: keyof CanvasNode) => string
  deletePart: (partId: string) => void
  shippingDestination?: Record<string, unknown> // ShippingDestination type
}

// テーブル表示専用UIコンポーネント
export function PartsManagementTable({
  unifiedParts,
  updateTextField,
  updateSelectField,
  updatePriceField,
  updateOrderDateField,
  getLatestFieldValue,
  deletePart
}: PartsManagementTableProps) {

  if (unifiedParts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No parts found</p>
        <p className="text-sm">Add components in the System Diagram first</p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-auto">
      <table className="divide-y divide-gray-200" style={{ minWidth: '1800px' }}>
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
              Part Name
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[400px]">
              Description / Specifications
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
              Qty
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
              Order Status
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
              Price (USD)
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px]">
              Est. Order Date
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
              Purchase Link
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
              Notes
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {unifiedParts.map((part) => (
            <tr key={part.id} className="hover:bg-gray-50">
              {/* Part Name */}
              <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                <div>
                  <div className="font-medium">{part.name}</div>
                  {part.modelNumber && (
                    <div className="text-xs text-gray-500">Model: {part.modelNumber}</div>
                  )}
                  {(part.quantity ?? 1) > 1 && (
                    <div className="text-xs text-blue-600">🔄 {part.quantity ?? 1} units total</div>
                  )}
                </div>
              </td>

              {/* Description */}
              <td className="px-3 py-3">
                <textarea
                  id={`description-${part.id}`}
                  name={`description-${part.id}`}
                  value={getLatestFieldValue(part, 'description')}
                  onChange={(e) => updateTextField(part.id, 'description', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      (e.target as HTMLTextAreaElement).blur()
                    }
                  }}
                  placeholder="Enter description..."
                  rows={4}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto"
                  style={{
                    whiteSpace: 'pre-wrap',
                    minHeight: '80px',
                    maxHeight: '160px'
                  }}
                />
              </td>

              {/* Quantity */}
              <td className="px-3 py-3 text-center">
                <div className="text-sm font-medium text-gray-900">
                  {part.quantity ?? 1}
                </div>
                {(part.quantity ?? 1) > 1 && (
                  <div className="text-xs text-gray-500">
                    (unified)
                  </div>
                )}
              </td>


              {/* Order Status */}
              <td className="px-3 py-3">
                <Select
                  value={part.orderStatus || 'Unordered'}
                  onValueChange={(value) => updateSelectField(part.id, 'orderStatus', value)}
                  name={`orderStatus-${part.id}`}
                >
                  <SelectTrigger className="w-full h-8 text-xs" id={`orderStatus-${part.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unordered">Unordered</SelectItem>
                    <SelectItem value="Quotation">Quotation</SelectItem>
                    <SelectItem value="Ordered">Ordered</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </td>

              {/* Price */}
              <td className="px-3 py-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                  <input
                    type="number"
                    id={`price-${part.id}`}
                    name={`price-${part.id}`}
                    autoComplete="off"
                    value={part.aiPricing?.unitPrice || getLatestFieldValue(part, 'price') || ''}
                    onChange={(e) => updatePriceField(part.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur()
                      }
                    }}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    readOnly={!!part.aiPricing}
                  />
                  <div className="relative group">
                    <Info className="w-4 h-4 text-blue-500 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[1000]">
                      <div className="space-y-1">
                        {part.aiPricing ? (
                          <>
                            <div>Unit Price: ${part.aiPricing.unitPrice}</div>
                            <div>Supplier: {part.aiPricing.supplier || 'AI Search'}</div>
                            <div>Stock: {part.aiPricing.availability || 'Unknown'}</div>
                            {/* 配送情報が利用可能な場合 */}
                            {(part.aiPricing as Record<string, unknown>).deliveryDays && (
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div className="font-semibold">配送情報</div>
                                <div>配送日数: {(part.aiPricing as Record<string, unknown>).deliveryDays}日</div>
                                <div>倉庫: {(part.aiPricing as Record<string, unknown>).shippingLocation || '不明'}</div>
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-2">Last Updated: {part.aiPricing.lastUpdated ? new Date(part.aiPricing.lastUpdated).toLocaleDateString('en-US') : 'Unknown'}</div>
                          </>
                        ) : (
                          <div className="text-gray-300">No pricing information available</div>
                        )}
                      </div>
                      <div className="absolute top-full left-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
                    </div>
                  </div>
                  </div>
                  {/* 配送日数の簡易表示 */}
                  {part.aiPricing && (part.aiPricing as Record<string, unknown>).deliveryDays && (
                    <div className="text-xs text-gray-500">
                      配送: {(part.aiPricing as Record<string, unknown>).deliveryDays}日
                    </div>
                  )}
                </div>
              </td>

              {/* Estimated Order Date */}
              <td className="px-3 py-3">
                <input
                  type="date"
                  id={`orderDate-${part.id}`}
                  name={`orderDate-${part.id}`}
                  autoComplete="off"
                  value={getLatestFieldValue(part, 'estimatedOrderDate') || ''}
                  onChange={(e) => updateOrderDateField(part.id, e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </td>

              {/* Purchase Link */}
              <td className="px-3 py-3">
                <div className="flex flex-col gap-1">
                  <input
                    type="url"
                    id={`purchaseLink-${part.id}`}
                    name={`purchaseLink-${part.id}`}
                    autoComplete="url"
                    value={getLatestFieldValue(part, 'purchaseSiteLink')}
                    onChange={(e) => updateTextField(part.id, 'purchaseSiteLink', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur()
                      }
                    }}
                    placeholder="https://..."
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {/* Perplexity APIからの直接購入リンク */}
                  {part.aiPricing && (part.aiPricing as Record<string, unknown>).purchaseUrl && (
                    <a 
                      href={(part.aiPricing as Record<string, unknown>).purchaseUrl as string} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1"
                      title={(part.aiPricing as Record<string, unknown>).isDirectLink ? "直接購入リンク" : "検索結果"}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {part.aiPricing.supplier || 'Buy'} 
                      {(part.aiPricing as Record<string, unknown>).isDirectLink && " ✓"}
                    </a>
                  )}
                  {/* 手動入力リンク */}
                  {part.purchaseSiteLink && (
                    <a 
                      href={part.purchaseSiteLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-xs flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Link
                    </a>
                  )}
                </div>
              </td>

              {/* Notes */}
              <td className="px-3 py-3">
                <textarea
                  id={`notes-${part.id}`}
                  name={`notes-${part.id}`}
                  value={getLatestFieldValue(part, 'notes')}
                  onChange={(e) => updateTextField(part.id, 'notes', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      (e.target as HTMLTextAreaElement).blur()
                    }
                  }}
                  placeholder="Notes..."
                  rows={4}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto"
                  style={{
                    whiteSpace: 'pre-wrap',
                    minHeight: '80px',
                    maxHeight: '160px'
                  }}
                />
              </td>

              {/* Actions (Delete Button) */}
              <td className="px-3 py-3 text-center">
                <button
                  onClick={() => deletePart(part.id)}
                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                  title="Delete part"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}