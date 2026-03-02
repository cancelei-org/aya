#!/bin/bash

echo "🔄 Fixing relative imports in components..."

# SoftwareContextPanel.tsx
sed -i "s|from './SystemRequirementsInput'|from '@/components/management/SystemRequirementsInput'|g" components/context/SoftwareContextPanel.tsx
sed -i "s|from './DetectedLibrariesDisplay'|from '@/components/ai-search/DetectedLibrariesDisplay'|g" components/context/SoftwareContextPanel.tsx

# PartsManagement.tsx
sed -i "s|from './parts/PartsManagementState'|from '@/components/parts/PartsManagementState'|g" components/management/PartsManagement.tsx
sed -i "s|from './parts/PartsManagementLogic'|from '@/components/parts/PartsManagementLogic'|g" components/management/PartsManagement.tsx
sed -i "s|from './parts/PartsManagementTable'|from '@/components/parts/PartsManagementTable'|g" components/management/PartsManagement.tsx

# ChatPanelUI.tsx
sed -i "s|from '\.\./SuggestionModal'|from '@/components/modals/SuggestionModal'|g" components/chat/ChatPanelUI.tsx
sed -i "s|from '\.\./SuggestionCard'|from '@/components/cards/SuggestionCard'|g" components/chat/ChatPanelUI.tsx
sed -i "s|from '\.\./FileUpload'|from '@/components/management/FileUpload'|g" components/chat/ChatPanelUI.tsx

# ComplexComponentManager.tsx
sed -i "s|from '\.\./ManualAISearch'|from '@/components/ai-search/ManualAISearch'|g" components/management/ComplexComponentManager.tsx
sed -i "s|from '\.\./ReliabilityScoreDisplay'|from '@/components/ai-search/ReliabilityScoreDisplay'|g" components/management/ComplexComponentManager.tsx

# MainCanvas.tsx
sed -i "s|from '\.\./PartsManagement'|from '@/components/management/PartsManagement'|g" components/canvas/MainCanvas.tsx
sed -i "s|from '\.\./IntegratedWarningPanel'|from '@/components/warnings/IntegratedWarningPanel'|g" components/canvas/MainCanvas.tsx
sed -i "s|from '\.\./CompatibilityResultModal'|from '@/components/modals/CompatibilityResultModal'|g" components/canvas/MainCanvas.tsx
sed -i "s|from '\.\./SystemDiagramFlow'|from '@/components/canvas/SystemDiagramFlow'|g" components/canvas/MainCanvas.tsx
sed -i "s|from '\.\./VisualInformation'|from '@/components/visualization/VisualInformation'|g" components/canvas/MainCanvas.tsx
sed -i "s|from '\.\./PortOptimizationSettings'|from '@/components/context/PortOptimizationSettings'|g" components/canvas/MainCanvas.tsx

echo "✅ Relative imports fixed!"