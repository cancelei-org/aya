'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useStores } from '@/hooks/useStores'

interface DeleteStats {
  deletedRequirements: number
  deletedNodes: number
  deletedConnections: number
  updatedProjects: number
  clearedJsonData?: boolean
}

interface BulkDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function BulkDeleteDialog({ isOpen, onClose }: BulkDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showFinalConfirm, setShowFinalConfirm] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; stats?: DeleteStats; error?: string } | null>(null)
  const router = useRouter()
  const { setNodes, setConnections } = useStores()

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteResult(null)

    try {
      const response = await fetch('/api/admin/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete data')
      }

      setDeleteResult({ success: true, stats: data.stats })
      
      // Clear React Flow state immediately
      setNodes([])
      setConnections([])
      
      // Then reload the page to ensure everything is synced
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      console.error('Bulk delete error:', error)
      setDeleteResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      })
    } finally {
      setIsDeleting(false)
      setShowFinalConfirm(false)
    }
  }

  const handleReset = () => {
    setShowFinalConfirm(false)
    setDeleteResult(null)
  }

  const handleClose = () => {
    if (!isDeleting) {
      handleReset()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showFinalConfirm ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">Final Confirmation</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span>Bulk Delete Data</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {deleteResult ? (
            deleteResult.success ? (
              <div className="space-y-2">
                <p className="font-semibold text-green-700">Deletion completed successfully</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Requirements: {deleteResult.stats?.deletedRequirements} deleted</li>
                  <li>System Diagram: {deleteResult.stats?.clearedJsonData ? 'Cleared' : 'Deleted'}</li>
                  <li>Updated Projects: {deleteResult.stats?.updatedProjects}</li>
                </ul>
                <p className="text-sm text-gray-500 mt-2">Refreshing page...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold text-red-700">Deletion failed</p>
                <p className="text-sm text-red-600">{deleteResult.error}</p>
              </div>
            )
          ) : showFinalConfirm ? (
            <div className="space-y-3">
              <p className="font-semibold text-red-700">
                This action cannot be undone!
              </p>
              <p>
                Are you absolutely sure you want to delete all requirements and system diagrams from your project?
              </p>
              <div className="bg-red-50 p-3 rounded-md">
                <p className="text-sm text-red-700">
                  Data to be deleted:
                </p>
                <ul className="text-sm text-red-600 mt-1 list-disc list-inside">
                  <li>All requirements documents</li>
                  <li>All system diagram nodes</li>
                  <li>All connections between nodes</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p>
                All requirements documents and system diagram data in your project will be deleted.
              </p>
              <p className="text-sm text-gray-600">
                Do you want to continue with this operation?
              </p>
            </div>
          )}
        </div>

        {!deleteResult && (
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            {showFinalConfirm ? (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Execute Delete'}
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={() => setShowFinalConfirm(true)}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                Continue
              </Button>
            )}
          </DialogFooter>
        )}

        {deleteResult?.success && (
          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}