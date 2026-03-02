import { useCallback, useTransition, useDeferredValue } from 'react'

interface UseOptimizedTabProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function useOptimizedTab({ activeTab, setActiveTab }: UseOptimizedTabProps) {
  const [isPending, startTransition] = useTransition()
  const deferredActiveTab = useDeferredValue(activeTab)
  
  const handleTabChange = useCallback((newTab: string) => {
    // Use startTransition for low-priority updates
    startTransition(() => {
      setActiveTab(newTab)
    })
  }, [setActiveTab])
  
  return {
    activeTab: deferredActiveTab,
    handleTabChange,
    isPending
  }
}