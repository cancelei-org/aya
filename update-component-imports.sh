#!/bin/bash

# Components import path updates script

echo "🔄 Updating component import paths..."

# AI/Search components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/AISearchResultsManager'|from '@/components/ai-search/AISearchResultsManager'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/ManualAISearch'|from '@/components/ai-search/ManualAISearch'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/ReliabilityScoreDisplay'|from '@/components/ai-search/ReliabilityScoreDisplay'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/MarketDataDisplay'|from '@/components/ai-search/MarketDataDisplay'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/DetectedLibrariesDisplay'|from '@/components/ai-search/DetectedLibrariesDisplay'|g"

# Canvas components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/MainCanvas'|from '@/components/canvas/MainCanvas'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/SystemDiagramFlow'|from '@/components/canvas/SystemDiagramFlow'|g"

# Warning components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/DirectionalityWarning'|from '@/components/warnings/DirectionalityWarning'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/PowerCapacityWarning'|from '@/components/warnings/PowerCapacityWarning'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/UnconnectedPartsWarning'|from '@/components/warnings/UnconnectedPartsWarning'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/IntegratedWarningPanel'|from '@/components/warnings/IntegratedWarningPanel'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/UserFriendlyErrorDisplay'|from '@/components/warnings/UserFriendlyErrorDisplay'|g"

# Layout components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/Sidebar'|from '@/components/layout/Sidebar'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/TopBar'|from '@/components/layout/TopBar'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/LoadingScreen'|from '@/components/layout/LoadingScreen'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/SignInPrompt'|from '@/components/layout/SignInPrompt'|g"

# Management components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/PartsManagement'|from '@/components/management/PartsManagement'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/ComplexComponentManager'|from '@/components/management/ComplexComponentManager'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/FileUpload'|from '@/components/management/FileUpload'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/SystemRequirementsInput'|from '@/components/management/SystemRequirementsInput'|g"

# Monitoring components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/CacheMonitoringDashboard'|from '@/components/monitoring/CacheMonitoringDashboard'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/PerformanceDashboard'|from '@/components/monitoring/PerformanceDashboard'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/DevLog'|from '@/components/monitoring/DevLog'|g"

# Modal components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/SuggestionModal'|from '@/components/modals/SuggestionModal'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/CompatibilityResultModal'|from '@/components/modals/CompatibilityResultModal'|g"

# Visualization components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/MultiConnectionVisualizer'|from '@/components/visualization/MultiConnectionVisualizer'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/ExpandablePortView'|from '@/components/visualization/ExpandablePortView'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/VisualInformation'|from '@/components/visualization/VisualInformation'|g"

# Card components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/SuggestionCard'|from '@/components/cards/SuggestionCard'|g"

# Context components
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/SoftwareContextPanel'|from '@/components/context/SoftwareContextPanel'|g"
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/PortOptimizationSettings'|from '@/components/context/PortOptimizationSettings'|g"

# ChatPanel moved to chat folder
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i "s|from '@/components/ChatPanel'|from '@/components/chat/ChatPanel'|g"

# Fix relative imports within component files
echo "🔄 Fixing relative imports..."

# Fix imports in ai-search folder
cd components/ai-search
find . -name "*.tsx" | xargs sed -i "s|from '\.\./|from '@/components/|g"
find . -name "*.tsx" | xargs sed -i "s|from '\.\./\.\./|from '@/|g"
cd ../..

# Fix imports in other folders similarly
for folder in canvas warnings layout management monitoring modals visualization cards context; do
  if [ -d "components/$folder" ]; then
    cd components/$folder
    find . -name "*.tsx" | xargs sed -i "s|from '\.\./|from '@/components/|g"
    find . -name "*.tsx" | xargs sed -i "s|from '\.\./\.\./|from '@/|g"
    cd ../..
  fi
done

echo "✅ Component import paths updated!"