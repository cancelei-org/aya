import React, { useState } from 'react'
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'

interface CustomEdgeData {
  onDelete?: () => void
  // 🎯 Phase 2: Connection information display
  communication?: string
  voltage?: string
  label?: string
}

export const CustomEdge: React.FC<EdgeProps> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    label,
  } = props
  const edgeData = data as CustomEdgeData
  console.log('🔗 CustomEdge rendered:', { 
    id, 
    hasDeleteFunction: !!edgeData?.onDelete,
    communication: edgeData?.communication,
    voltage: edgeData?.voltage,
    label
  })
  const [isHovered, setIsHovered] = useState(false)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    console.log('🖱️ Right-click on edge:', id)
    
    // 右クリックで即座に削除
    handleDelete(event)
  }

  const handleDelete = () => {
    console.log('🗑️ Deleting edge immediately:', id)
    console.log('Delete function exists:', !!edgeData?.onDelete)
    
    if (edgeData?.onDelete) {
      console.log('Calling onDelete function...')
      edgeData.onDelete()
      console.log('onDelete function called successfully')
    } else {
      console.warn('No onDelete function provided in edge data')
    }
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    console.log('🖱️ Mouse entered edge:', id, '- Line will turn red')
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    console.log('🖱️ Mouse left edge:', id, '- Line back to normal')
  }

  return (
    <>
      {/* 透明な太いパス（クリック判定用） */}
      <path
        d={edgePath}
        style={{
          stroke: 'transparent',
          strokeWidth: 12, // クリック判定を大きくする
          fill: 'none',
        }}
        className="cursor-pointer"
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()} // 背景クリックを防ぐ
      />
      
      {/* 実際に表示される線 */}
      <path
        id={id as string}
        style={{
          ...style,
          stroke: isHovered ? '#ef4444' : '#6b7280', // ホバー時は赤色、通常時はグレー
          strokeWidth: isHovered ? 4 : 3, // ホバー時は少し太く
          fill: 'none',
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease', // スムーズな色変更
        }}
        className="react-flow__edge-path pointer-events-none" // ポインターイベントを無効化
        d={edgePath}
        markerEnd={isHovered ? "url(#arrowclosed-red)" : "url(#arrowclosed)"}
      />
      
      {/* 🎯 Phase 2: Connection information display */}
      {(edgeData?.communication || edgeData?.voltage || label) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs shadow-sm"
          >
            {edgeData?.communication && (
              <div className="text-blue-600 font-medium">{edgeData.communication}</div>
            )}
            {edgeData?.voltage && (
              <div className="text-green-600">{edgeData.voltage}</div>
            )}
            {label && !edgeData?.communication && !edgeData?.voltage && (
              <div className="text-gray-600">{label}</div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default CustomEdge