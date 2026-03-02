import React from 'react'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

interface Stage {
  id: string
  label: string
  description: string
  progress: number
}

interface SystemGenerationProgressProps {
  currentStage: string
  message: string
  progress: number
}

const stages: Stage[] = [
  { id: 'stage1', label: '部品抽出', description: '要件から部品リストを生成', progress: 15 },
  { id: 'stage2-1', label: '仕様詳細化', description: '電圧・通信プロトコル追加', progress: 30 },
  { id: 'ports', label: '動的ポート生成', description: 'ポート配置を自動生成', progress: 50 },
  { id: 'connections', label: '接続生成', description: 'ポート間の配線を決定', progress: 70 },
  { id: 'layout', label: 'レイアウト', description: '最適な配置を計算', progress: 90 },
]

export const SystemGenerationProgress: React.FC<SystemGenerationProgressProps> = ({
  currentStage,
  message,
  progress
}) => {
  console.log('🚀 SystemGenerationProgress rendered with:', { currentStage, message, progress })
  const getStageStatus = (stage: Stage) => {
    const currentIndex = stages.findIndex(s => s.id === currentStage)
    const stageIndex = stages.findIndex(s => s.id === stage.id)
    
    if (stageIndex < currentIndex) return 'completed'
    if (stageIndex === currentIndex) return 'active'
    return 'pending'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{message}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="h-full bg-white/20 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stage List */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage)
          
          return (
            <div key={stage.id} className="flex items-start gap-3">
              {/* Stage Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : status === 'active' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
              </div>
              
              {/* Stage Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    status === 'completed' ? 'text-green-700' :
                    status === 'active' ? 'text-blue-700' :
                    'text-gray-400'
                  }`}>
                    {stage.label}
                  </span>
                  {status === 'active' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      処理中
                    </span>
                  )}
                  {stage.id === 'ports' && status === 'completed' && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      UIに表示済み
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {stage.description}
                </p>
              </div>
              
              {/* Connection Line */}
              {index < stages.length - 1 && (
                <div className="absolute ml-2.5 mt-8 w-0.5 h-8 bg-gray-200" />
              )}
            </div>
          )
        })}
      </div>

      {/* Special Note for Dynamic Ports */}
      {currentStage === 'ports' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            🎯 <strong>動的ポートが生成されました！</strong>
            <br />
            ノードに動的ポートが表示されています。接続生成を続行中...
          </p>
        </div>
      )}

      {/* Completion Message */}
      {progress === 100 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            ✅ <strong>システム設計が完了しました！</strong>
            <br />
            すべてのコンポーネントと接続が生成されました。
          </p>
        </div>
      )}
    </div>
  )
}