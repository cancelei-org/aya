"use client"

import React from 'react'
import type { UserSystemRequirements } from '@/types'

interface SystemRequirementsInputProps {
  requirements: UserSystemRequirements
  onRequirementsChange: (requirements: UserSystemRequirements) => void
}

const RAM_OPTIONS = [
  { value: '4GB', label: '4GB or more' },
  { value: '8GB', label: '8GB or more' },
  { value: '16GB', label: '16GB or more' },
  { value: '32GB', label: '32GB or more' }
]

export function SystemRequirementsInput({ 
  requirements, 
  onRequirementsChange 
}: SystemRequirementsInputProps) {

  const handleInputChange = (field: keyof UserSystemRequirements, value: string) => {
    onRequirementsChange({
      ...requirements,
      [field]: value
    })
  }

  return (
    <div className="mb-4 p-3 border border-green-200 rounded-lg bg-green-50">
      <h3 className="text-sm font-semibold text-green-800 mb-3">
        ⚙️ System Requirements
      </h3>
      
      {/* OS要件 */}
      <div className="mb-3">
        <label htmlFor="target-os" className="text-xs font-medium text-gray-700 block mb-1">
          Target OS:
        </label>
        <input
          id="target-os"
          name="target-os"
          type="text"
          autoComplete="off"
          placeholder="e.g., Windows 11, macOS, Ubuntu 22.04"
          value={requirements.targetOS}
          onChange={(e) => handleInputChange('targetOS', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* CPU要件 */}
      <div className="mb-3">
        <label htmlFor="target-cpu" className="text-xs font-medium text-gray-700 block mb-1">
          CPU Requirements:
        </label>
        <input
          id="target-cpu"
          name="target-cpu"
          type="text"
          autoComplete="off"
          placeholder="e.g., Intel i5 8th gen or AMD Ryzen 5"
          value={requirements.targetCPU}
          onChange={(e) => handleInputChange('targetCPU', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* GPU要件（オプション） */}
      <div className="mb-3">
        <label htmlFor="target-gpu" className="text-xs font-medium text-gray-700 block mb-1">
          GPU Requirements (optional):
        </label>
        <input
          id="target-gpu"
          name="target-gpu"
          type="text"
          autoComplete="off"
          placeholder="e.g., RTX 3060 or better for ML tasks"
          value={requirements.targetGPU || ''}
          onChange={(e) => handleInputChange('targetGPU', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* RAM要件 */}
      <div className="mb-3">
        <label htmlFor="target-ram" className="text-xs font-medium text-gray-700 block mb-1">
          RAM Requirements:
        </label>
        <select
          id="target-ram"
          name="target-ram"
          value={requirements.targetRAM || ''}
          onChange={(e) => handleInputChange('targetRAM', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Select RAM requirement</option>
          {RAM_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 追加要件 */}
      <div>
        <label htmlFor="additional-notes" className="text-xs font-medium text-gray-700 block mb-1">
          Additional Notes:
        </label>
        <textarea
          id="additional-notes"
          name="additional-notes"
          placeholder="Any other requirements or constraints..."
          value={requirements.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          rows={2}
        />
      </div>

      {/* 要件サマリー */}
      {(requirements.targetOS || requirements.targetCPU || requirements.targetGPU || requirements.targetRAM) && (
        <div className="mt-3 p-2 bg-white rounded border border-green-200">
          <div className="text-xs font-medium text-green-800 mb-1">Requirements Summary:</div>
          <div className="space-y-1 text-xs text-gray-600">
            {requirements.targetOS && (
              <div>• OS: {requirements.targetOS}</div>
            )}
            {requirements.targetCPU && (
              <div>• CPU: {requirements.targetCPU}</div>
            )}
            {requirements.targetGPU && (
              <div>• GPU: {requirements.targetGPU}</div>
            )}
            {requirements.targetRAM && (
              <div>• RAM: {requirements.targetRAM}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}