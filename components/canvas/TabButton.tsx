import { memo } from 'react'

interface TabButtonProps {
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
  tabSize: {
    padding: string
    fontSize: string
  }
}

// Memoized tab button to prevent unnecessary re-renders
export const TabButton = memo(function TabButton({ 
  isActive, 
  onClick, 
  children, 
  tabSize 
}: TabButtonProps) {
  return (
    <button
      className={`${tabSize.padding} ${tabSize.fontSize} font-medium border-b-2 flex-1 truncate ${
        isActive
          ? 'border-[#00AEEF] text-[#00AEEF] bg-[#00AEEF]/5'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
})