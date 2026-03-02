import React, { useState, useEffect } from 'react';
import {
  RequirementsDocument,
  RequirementStatus,
  EditorContent,
  RequirementsSection,
} from '@/types/requirements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import RichTextEditor from '@/components/editor/RichTextEditor';
import StructuredView from '@/components/requirements/StructuredView';
import ReviewMode from '@/components/requirements/ReviewMode';
import { RequirementsValidator } from '@/lib/validators/requirementsValidator';
import { convertMarkdownToTiptap } from '@/lib/utils/markdownToTiptap';
import {
  FileText,
  Edit,
  Eye,
  Check,
  Clock,
  AlertCircle,
  History,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  X,
  CheckCircle,
} from 'lucide-react';

interface RequirementsViewerProps {
  requirementId: string;
  mode?: 'view' | 'edit' | 'review';
  onStatusChange?: (status: RequirementStatus) => void;
  onEdit?: () => void;
  onApprove?: (requirementId: string, document: RequirementsDocument) => void;
  onDelete?: () => void;
}

export default function RequirementsViewer({
  requirementId,
  mode = 'view',
  onStatusChange,
  onEdit,
  onApprove,
  onDelete,
}: RequirementsViewerProps) {
  const [document, setDocument] = useState<RequirementsDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [completeness, setCompleteness] = useState<{
    overall: number;
    sections: RequirementsSection[];
  }>({ overall: 0, sections: [] });
  const [activeTab, setActiveTab] = useState('document');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<EditorContent | null>(
    null,
  );
  const [validationResult, setValidationResult] = useState<ReturnType<
    typeof RequirementsValidator.prototype.validate
  > | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<
    Array<{
      id: string;
      timestamp: string;
      user: string;
      action: string;
      comment?: string;
    }>
  >([]);
  const [isApproving, setIsApproving] = useState(false);
  const [isUnapproving, setIsUnapproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRequirements();
    fetchCompleteness();
    fetchApprovalHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementId]);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      console.log(
        '📄 [RequirementsViewer] Fetching requirements for ID:',
        requirementId,
      );
      const response = await fetch(`/api/requirements/${requirementId}`);
      console.log('📄 [RequirementsViewer] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(
          '📄 [RequirementsViewer] Successfully loaded document:',
          data,
        );
        
        // Handle content format conversion if needed
        if (data.content && typeof data.content === 'string') {
          console.log('📄 [RequirementsViewer] Converting markdown to TipTap format');
          data.content = convertMarkdownToTiptap(data.content);
        }
        
        setDocument(data);
      } else if (response.status === 401) {
        console.error(
          '📄 [RequirementsViewer] Authentication error - user not logged in',
        );
        setDocument(null);
      } else if (
        response.status === 404 &&
        requirementId.startsWith('req-mock-')
      ) {
        // For mock documents, use default data
        const mockDocument: RequirementsDocument = {
          id: requirementId,
          projectId: 'default-project',
          userId: 'user-123',
          title: 'Robotic Arm Requirements',
          content: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [
                  { type: 'text', text: 'Robotic Arm Requirements Document' },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'This document defines the requirements for a robotic arm system.',
                  },
                ],
              },
            ],
          },
          contentText: `# Robotic Arm Requirements Document

## 1. System Purpose and Overview
This document defines the requirements for a robotic arm system. The system aims to provide reliable and efficient operation for the intended application.

## 2. Functional Requirements
- 6-axis movement capability
- Precise positioning and control
- Safety and operational features
- User interface requirements

## 3. Non-functional Requirements
- Payload capacity: 5kg maximum
- Positioning accuracy: ±0.1mm
- Operating// temperature: 0°C to 45°C
- Safety compliance requirements

## 4. Constraints
- Maximum reach: 800mm
- Power consumption: 100W maximum
- Cost target: Under $10,000
- Industrial safety standards compliance

## 5. Hardware Requirements
- Servo motors for each axis
- Position sensors and encoders
- Safety systems and emergency stops
- Control system and processing unit

## 6. Software Requirements
- Motion control software
- User interface software
- Safety monitoring systems
- Programming interface for automation

## 7. Interface Requirements
- Ethernet communication interface
- Emergency stop connections
- Power supply interface
- Tool mounting interface`,
          status: 'DRAFT',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setDocument(mockDocument);
      } else {
        console.error(
          '📄 [RequirementsViewer] Failed to fetch requirements:',
          response.status,
          response.statusText,
        );
        const errorText = await response.text();
        console.error('📄 [RequirementsViewer] Error response:', errorText);
      }
    } catch (error) {
      console.error(
        '📄 [RequirementsViewer] Exception while fetching requirements:',
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCompleteness = async () => {
    try {
      console.log(
        '📄 [RequirementsViewer] Fetching completeness for ID:',
        requirementId,
      );
      const response = await fetch(
        `/api/requirements/${requirementId}/completeness`,
      );
      console.log(
        '📄 [RequirementsViewer] Completeness response status:',
        response.status,
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📄 [RequirementsViewer] Completeness data:', data);
        setCompleteness(data);
      } else if (response.status === 404) {
        // Use default completeness data for mock documents
        setCompleteness({
          overall: 75,
          sections: [
            {
              name: 'System Purpose',
              completeness: 100,
              status: 'complete',
            },
            {
              name: 'Functional Requirements',
              completeness: 80,
              status: 'partial',
            },
            {
              name: 'Non-functional Requirements',
              completeness: 70,
              status: 'partial',
            },
            {
              name: 'Constraints',
              completeness: 60,
              status: 'partial',
            },
          ],
        });
      }
    } catch (error) {
      console.error('Failed to fetch completeness:', error);
      // Set default completeness even on error
      setCompleteness({
        overall: 75,
        sections: [],
      });
    }
  };

  const fetchApprovalHistory = async () => {
    try {
      const response = await fetch(
        `/api/requirements/${requirementId}/approval-history`,
      );
      if (response.ok) {
        const data = await response.json();
        setApprovalHistory(data);
      } else if (response.status === 404) {
        // Use empty approval history for mock documents
        setApprovalHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch approval history:', error);
      setApprovalHistory([]);
    }
  };

  // handleApprove removed as it's not currently used

  const handleUnapprove = async () => {
    if (!document) return;

    try {
      setIsUnapproving(true);
      const response = await fetch(
        `/api/requirements/${requirementId}/unapprove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );

      if (response.ok) {
        // Refresh the document to show updated status
        await fetchRequirements();
        await fetchApprovalHistory();
        onStatusChange?.('DRAFT');

        // Show success message (optional)
        console.log('✅ Requirements unapproved successfully');
      } else {
        let errorMessage = 'Unknown error';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || 'Failed to unapprove';
          console.error('Failed to unapprove:', error);
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        alert(`Failed to unapprove: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Failed to unapprove requirements:', error);
      alert('Failed to unapprove requirements. Please try again.');
    } finally {
      setIsUnapproving(false);
    }
  };

  // handleExport removed as it's not currently used

  const handleSave = async () => {
    if (!editedContent) return;

    try {
      const response = await fetch(`/api/requirements/${requirementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent }),
      });

      if (response.ok) {
        await fetchRequirements();
        setIsEditing(false);
        setEditedContent(null);
      }
    } catch (error) {
      console.error('Failed to save requirements:', error);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('requirementId', requirementId);

    try {
      const response = await fetch('/api/requirements/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
      throw new Error('Failed to upload image');
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  };

  const runValidation = async () => {
    if (!document) return;

    const validator = new RequirementsValidator();
    const result = validator.checkConsistency(document, completeness.sections);
    const suggestions = validator.generateImprovementSuggestions(result);

    setValidationResult({
      ...result,
      suggestions,
    });
  };

  const handleReviewApprove = async (comments: string) => {
    try {
      setIsApproving(true);
      const response = await fetch(
        `/api/requirements/${requirementId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comments,
            reviewData: {
              approvedAt: new Date().toISOString(),
              reviewComments: comments,
            },
          }),
        },
      );

      if (response.ok) {
        await Promise.all([fetchRequirements(), fetchApprovalHistory()]);
        onStatusChange?.('APPROVED');

        // Call onApprove callback if provided to trigger system building
        console.log('🎯 [RequirementsViewer] Checking onApprove callback:', {
          hasOnApprove: !!onApprove,
          hasDocument: !!document,
          requirementId,
          documentTitle: document?.title
        });
        if (onApprove && document) {
          console.log('✅ [RequirementsViewer] Calling onApprove callback');
          onApprove(requirementId, document);
        } else {
          console.warn('⚠️ [RequirementsViewer] onApprove not called:', {
            onApprove: typeof onApprove,
            document: typeof document
          });
        }
      }
    } catch (error) {
      console.error('Failed to approve requirements:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReviewReject = async (comments: string) => {
    try {
      setIsApproving(true);
      const response = await fetch(
        `/api/requirements/${requirementId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comments,
            reviewData: {
              rejectedAt: new Date().toISOString(),
              reviewComments: comments,
            },
          }),
        },
      );

      if (response.ok) {
        await Promise.all([fetchRequirements(), fetchApprovalHistory()]);
        onStatusChange?.('REJECTED');
      }
    } catch (error) {
      console.error('Failed to reject requirements:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete this requirements document? This action cannot be undone.',
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(
        `/api/requirements/${requirementId}/delete`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (response.ok) {
        onDelete?.();
      } else {
        const error = await response.json();
        alert(`削除に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to delete requirements:', error);
      alert('削除中にエラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: RequirementStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-500';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-500';
      case 'APPROVED':
        return 'bg-green-500';
      case 'REJECTED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: RequirementStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Edit className="w-4 h-4" />;
      case 'PENDING_APPROVAL':
        return <Clock className="w-4 h-4" />;
      case 'APPROVED':
        return <Check className="w-4 h-4" />;
      case 'REJECTED':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading || !document) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-2xl">
              {document.title} v{document.version}
            </CardTitle>
            <Badge
              className={`${getStatusColor(document.status)} text-white flex items-center gap-1`}
            >
              {getStatusIcon(document.status)}
              {document.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'view' && !isEditing && (
              <Button
                onClick={() => {
                  setIsEditing(true);
                  setEditedContent(document.content);
                  if (onEdit) onEdit();
                }}
                variant="outline"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}

            {/* Simple approve button for draft status */}
            {document.status === 'DRAFT' && (
              <Button
                onClick={() =>
                  handleReviewApprove('Approved and building system')
                }
                variant="default"
                size="sm"
                disabled={isApproving}
              >
                <Check className="w-4 h-4 mr-2" />
                {isApproving ? 'Approving...' : 'Approve & Build System'}
              </Button>
            )}

            {/* Unapprove button for approved status */}
            {document.status === 'APPROVED' && (
              <Button
                onClick={handleUnapprove}
                variant="outline"
                size="sm"
                disabled={isUnapproving}
              >
                <X className="w-4 h-4 mr-2" />
                {isUnapproving ? 'Unapproving...' : 'Unapprove'}
              </Button>
            )}
            {/* エクスポートと共有機能が実装できてから表示する予定 */}
            {/* <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button> */}

            <Button
              onClick={handleDelete}
              variant="outline"
              size="sm"
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Overall Completeness</span>
            <span className="font-medium">{completeness.overall}%</span>
          </div>
          <Progress value={completeness.overall} className="h-2" />
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Version: {document.version}</span>
          <span>
            Created:{' '}
            {new Date(document.createdAt).toLocaleString('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {document.approvedAt && (
            <span>
              Approved:{' '}
              {new Date(document.approvedAt).toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 sticky top-0 bg-white z-10">
            <TabsTrigger value="document">Document</TabsTrigger>
            {/* <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger> */}
          </TabsList>

          <TabsContent value="document" className="mt-6">
            {isEditing || mode === 'edit' ? (
              <div className="space-y-4">
                <RichTextEditor
                  content={editedContent || document.content}
                  onChange={setEditedContent}
                  placeholder="Start writing your requirements document..."
                  onImageUpload={handleImageUpload}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedContent(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onDoubleClick={() => {
                  setIsEditing(true);
                  // Ensure content is in correct format for editing
                  const contentForEdit = typeof document.content === 'string' 
                    ? convertMarkdownToTiptap(document.content) 
                    : document.content;
                  setEditedContent(contentForEdit);
                  if (onEdit) onEdit();
                }}
                className="cursor-pointer hover:bg-gray-50 transition-colors rounded-lg p-2"
                title="Double-click to edit"
              >
                <RichTextEditor 
                  content={typeof document.content === 'string' 
                    ? convertMarkdownToTiptap(document.content) 
                    : document.content} 
                  readOnly={true} 
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="structure" className="mt-6">
            <StructuredView
              requirementId={requirementId}
              sections={completeness.sections}
              onSectionClick={() => {
                // Scroll to section in document view
                setActiveTab('document');
                // TODO: Implement section scrolling
              }}
            />
          </TabsContent>

          <TabsContent value="decisions" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Key Decisions</h3>
              {document.decisions?.map((decision) => (
                <div key={decision.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{decision.content}</p>
                      {decision.context && (
                        <p className="text-sm text-gray-600 mt-1">
                          {decision.context}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        decision.importance === 'HIGH'
                          ? 'destructive'
                          : decision.importance === 'NORMAL'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {decision.importance}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(decision.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Approval History</h3>

              {approvalHistory.length > 0 ? (
                <div className="space-y-3">
                  {approvalHistory.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${entry.action === 'APPROVED'
                                ? 'bg-green-500'
                                : entry.action === 'REJECTED'
                                  ? 'bg-red-500'
                                  : entry.action === 'REVIEWED'
                                    ? 'bg-yellow-500'
                                    : entry.action === 'SUBMITTED'
                                      ? 'bg-blue-500'
                                      : 'bg-gray-500'
                              }`}
                          >
                            {entry.action === 'APPROVED' && (
                              <Check className="w-5 h-5" />
                            )}
                            {entry.action === 'REJECTED' && (
                              <AlertCircle className="w-5 h-5" />
                            )}
                            {entry.action === 'REVIEWED' && (
                              <Eye className="w-5 h-5" />
                            )}
                            {entry.action === 'SUBMITTED' && (
                              <FileText className="w-5 h-5" />
                            )}
                            {![
                              'APPROVED',
                              'REJECTED',
                              'REVIEWED',
                              'SUBMITTED',
                            ].includes(entry.action) && (
                                <Clock className="w-5 h-5" />
                              )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{entry.userName}</p>
                              <Badge
                                variant={
                                  entry.action === 'APPROVED'
                                    ? 'default'
                                    : entry.action === 'REJECTED'
                                      ? 'destructive'
                                      : entry.action === 'REVIEWED'
                                        ? 'secondary'
                                        : 'outline'
                                }
                                className="text-xs"
                              >
                                {entry.action === 'APPROVED'
                                  ? 'Approved'
                                  : entry.action === 'REJECTED'
                                    ? 'Rejected'
                                    : entry.action === 'REVIEWED'
                                      ? 'Reviewed'
                                      : entry.action === 'SUBMITTED'
                                        ? 'Submitted'
                                        : entry.action === 'UPDATED'
                                          ? 'Updated'
                                          : entry.action}
                              </Badge>
                            </div>

                            {entry.comment && (
                              <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                                {entry.comment}
                              </p>
                            )}

                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(entry.timestamp).toLocaleString(
                                'ja-JP',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No approval history yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="validation" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Consistency Check</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Validate requirements for consistency, completeness, and
                    industry standards
                  </p>
                </div>
                <Button onClick={runValidation} size="sm" variant="outline">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Run Validation
                </Button>
              </div>

              {validationResult && (
                <div className="space-y-6">
                  {/* Overall Score Card */}
                  <div
                    className={`p-6 rounded-lg border-2 ${validationResult.score >= 90
                        ? 'bg-green-50 border-green-200'
                        : validationResult.score >= 70
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold flex items-center gap-2">
                          Overall Consistency Score
                          {validationResult.score >= 90 && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                          {validationResult.score >= 70 &&
                            validationResult.score < 90 && (
                              <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            )}
                          {validationResult.score < 70 && (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                        </h4>
                        <p className="text-sm text-gray-700 mt-1">
                          {validationResult.isConsistent
                            ? 'Your requirements are consistent and well-structured'
                            : `Found ${validationResult.issues.filter((i) => i.severity === 'error').length} critical issues that need attention`}
                        </p>
                      </div>
                      <div className="text-center">
                        <p
                          className={`text-4xl font-bold ${validationResult.score >= 90
                              ? 'text-green-600'
                              : validationResult.score >= 70
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                        >
                          {validationResult.score}%
                        </p>
                        <Progress
                          value={validationResult.score}
                          className={`w-32 h-3 mt-2 ${validationResult.score >= 90
                              ? '[&>div]:bg-green-600'
                              : validationResult.score >= 70
                                ? '[&>div]:bg-yellow-600'
                                : '[&>div]:bg-red-600'
                            }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Issue Summary */}
                  {validationResult.issues.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <span className="font-medium text-red-900">
                              Errors
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-red-600">
                            {
                              validationResult.issues.filter(
                                (i) => i.severity === 'error',
                              ).length
                            }
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <span className="font-medium text-yellow-900">
                              Warnings
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-yellow-600">
                            {
                              validationResult.issues.filter(
                                (i) => i.severity === 'warning',
                              ).length
                            }
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-900">
                              Info
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-blue-600">
                            {
                              validationResult.issues.filter(
                                (i) => i.severity === 'info',
                              ).length
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Issues */}
                  {validationResult.issues.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Detailed Issues</h4>

                      {/* Group issues by severity */}
                      {['error', 'warning', 'info'].map((severity) => {
                        const severityIssues = validationResult.issues.filter(
                          (i) => i.severity === severity,
                        );
                        if (severityIssues.length === 0) return null;

                        return (
                          <div key={severity} className="space-y-3">
                            <h5
                              className={`font-medium flex items-center gap-2 ${severity === 'error'
                                  ? 'text-red-700'
                                  : severity === 'warning'
                                    ? 'text-yellow-700'
                                    : 'text-blue-700'
                                }`}
                            >
                              {severity === 'error' && (
                                <AlertCircle className="w-4 h-4" />
                              )}
                              {severity === 'warning' && (
                                <AlertTriangle className="w-4 h-4" />
                              )}
                              {severity === 'info' && (
                                <Info className="w-4 h-4" />
                              )}
                              {severity.charAt(0).toUpperCase() +
                                severity.slice(1)}
                              s ({severityIssues.length})
                            </h5>

                            {severityIssues.map((issue, idx: number) => (
                              <div
                                key={idx}
                                className={`p-4 rounded-lg border-l-4 ${severity === 'error'
                                    ? 'border-red-500 bg-red-50'
                                    : severity === 'warning'
                                      ? 'border-yellow-500 bg-yellow-50'
                                      : 'border-blue-500 bg-blue-50'
                                  }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <p
                                      className={`font-medium ${severity === 'error'
                                          ? 'text-red-900'
                                          : severity === 'warning'
                                            ? 'text-yellow-900'
                                            : 'text-blue-900'
                                        }`}
                                    >
                                      {issue.message}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className="ml-2 shrink-0"
                                    >
                                      {issue.section}
                                    </Badge>
                                  </div>

                                  {issue.suggestion && (
                                    <div className="pl-4 border-l-2 border-gray-300">
                                      <p className="text-sm text-gray-700 flex items-start gap-2">
                                        <span className="mt-0.5">💡</span>
                                        <span>{issue.suggestion}</span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Improvement Roadmap */}
                  {validationResult.suggestions &&
                    validationResult.suggestions.length > 0 && (
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                          Improvement Roadmap
                        </h4>
                        <div className="space-y-3">
                          {validationResult.suggestions.map(
                            (suggestion, idx: number) => (
                              <div key={idx} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium shrink-0">
                                  {idx + 1}
                                </div>
                                <p className="text-sm text-gray-700 pt-1">
                                  {suggestion}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Success State */}
                  {validationResult.issues.length === 0 && (
                    <div className="p-6 bg-green-50 rounded-lg border border-green-200 text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <h4 className="font-semibold text-lg text-green-900">
                        Excellent!
                      </h4>
                      <p className="text-sm text-green-700 mt-2">
                        Your requirements document has no validation issues.
                        It&apos;s well-structured and consistent.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Initial State */}
              {!validationResult && (
                <div className="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Click &quot;Run Validation&quot; to check your requirements
                    for consistency,
                    <br />
                    completeness, and adherence to industry standards.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="review" className="mt-6">
            <ReviewMode
              document={document}
              sections={completeness.sections}
              onApprove={handleReviewApprove}
              onReject={handleReviewReject}
              isReviewing={isApproving}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
