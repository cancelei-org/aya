import React, { useState, useEffect } from 'react'
import { RequirementsDocument } from '@/types/requirements'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  CheckCircle2,
  FileText,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react'

interface RequirementsSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (selectedRequirements: RequirementsDocument[]) => void
  projectId: string
}

export default function RequirementsSelectionDialog({
  isOpen,
  onClose,
  onSelect,
  projectId
}: RequirementsSelectionDialogProps) {
  const [requirements, setRequirements] = useState<RequirementsDocument[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('approved')

  useEffect(() => {
    if (isOpen) {
      fetchRequirements()
    }
  }, [isOpen, projectId])

  const fetchRequirements = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/requirements/approved?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setRequirements(data)
      }
    } catch (error) {
      console.error('Failed to fetch requirements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectionChange = (requirementId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(requirementId)
    } else {
      newSelected.delete(requirementId)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    const filteredRequirements = getFilteredRequirements()
    if (selectedIds.size === filteredRequirements.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRequirements.map(req => req.id)))
    }
  }

  const handleConfirm = () => {
    const selectedRequirements = requirements.filter(req => selectedIds.has(req.id))
    onSelect(selectedRequirements)
    onClose()
  }

  const getFilteredRequirements = () => {
    return requirements.filter(req => {
      const matchesSearch = searchTerm === '' || 
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.contentText || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterStatus === 'all' || 
        (filterStatus === 'approved' && req.status === 'APPROVED') ||
        (filterStatus === 'pending' && req.status !== 'APPROVED')
      
      return matchesSearch && matchesFilter
    })
  }

  const filteredRequirements = getFilteredRequirements()
  const approvedCount = requirements.filter(req => req.status === 'APPROVED').length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            システム提案用の要件定義書を選択
          </DialogTitle>
          <DialogDescription>
            承認済みの要件定義書を選択してシステム提案を生成します。
            複数の要件定義書を選択して包括的なシステム提案を作成できます。
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filter Controls */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="要件定義書を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'approved' | 'pending')}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="approved">承認済み</option>
              <option value="pending">未承認</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredRequirements.length === 0}
          >
            {selectedIds.size === filteredRequirements.length && filteredRequirements.length > 0 ? '全選択解除' : '全選択'}
          </Button>
        </div>

        {/* Statistics */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">承認済み: {approvedCount}件</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">選択中: {selectedIds.size}件</span>
            </div>
          </div>
          
          {selectedIds.size === 0 && (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">要件定義書を選択してください</span>
            </div>
          )}
        </div>

        {/* Requirements List */}
        <div className="flex-1 overflow-y-auto space-y-3 p-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRequirements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>条件に一致する要件定義書がありません</p>
            </div>
          ) : (
            filteredRequirements.map(req => (
              <Card 
                key={req.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedIds.has(req.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleSelectionChange(req.id, !selectedIds.has(req.id))}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Checkbox
                        checked={selectedIds.has(req.id)}
                        onCheckedChange={(checked) => handleSelectionChange(req.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{req.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={req.status === 'APPROVED' ? 'default' : 'secondary'}
                            className={req.status === 'APPROVED' ? 'bg-green-600' : ''}
                          >
                            {req.status === 'APPROVED' ? '承認済み' : '未承認'}
                          </Badge>
                          <span className="text-xs text-gray-500">v{req.version}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {req.contentText?.substring(0, 150)}
                        {(req.contentText?.length || 0) > 150 ? '...' : ''}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>作成日: {new Date(req.createdAt).toLocaleDateString('ja-JP')}</span>
                        {req.approvedAt && (
                          <span>承認日: {new Date(req.approvedAt).toLocaleDateString('ja-JP')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedIds.size === 0}
            className="min-w-[120px]"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {selectedIds.size > 0 ? `${selectedIds.size}件を選択` : '選択して続行'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}