'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, Zap, Radio, Info, X, AlertCircle } from 'lucide-react';
import type { Connection, NodeData } from '@/types';
import type { Node } from '@xyflow/react';
import type { DirectionalityResult } from '@/utils/connections/validation/connectionDirectionalityManager';
import { ConnectionDirectionalityManager } from '@/utils/connections/validation/connectionDirectionalityManager';
import { UserFriendlyErrorDisplay } from './UserFriendlyErrorDisplay';
import { translateDirectionalityError } from '@/utils/ui/userFriendlyMessages';

export interface DirectionalityWarningProps {
  connections: Connection[];
  components: Node<NodeData>[];
  onFixConnection?: (connectionId: string, suggestion: string) => void;
  enableAutoFix?: boolean;
  showUserFriendlyMessages?: boolean;
}

interface DirectionalityIssue {
  connection: Connection;
  fromComponent: Node<NodeData>;
  toComponent: Node<NodeData>;
  result: DirectionalityResult;
  autoFixSuggestion?: string;
}

export const DirectionalityWarning: React.FC<DirectionalityWarningProps> = ({
  connections,
  components,
  onFixConnection,
  enableAutoFix = false,
  showUserFriendlyMessages = true,
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const directionalityIssues = useMemo((): DirectionalityIssue[] => {
    const manager = ConnectionDirectionalityManager.getInstance();
    const issues: DirectionalityIssue[] = [];

    connections.forEach((connection) => {
      const fromComponent = components.find((c) => c.id === connection.fromId);
      const toComponent = components.find((c) => c.id === connection.toId);

      if (!fromComponent || !toComponent) return;

      const result = manager.validateConnectionDirectionality(
        connection,
        fromComponent,
        toComponent,
      );

      // エラーまたは警告がある場合のみ表示
      if (!result.isValid || result.severity === 'warning') {
        issues.push({
          connection,
          fromComponent,
          toComponent,
          result,
          autoFixSuggestion: generateAutoFixSuggestion(result),
        });
      }
    });

    return issues;
  }, [connections, components]);

  const criticalIssues = directionalityIssues.filter(
    (issue) => issue.result.severity === 'critical',
  );
  const warningIssues = directionalityIssues.filter(
    (issue) => issue.result.severity === 'warning',
  );

  if (directionalityIssues.length === 0) {
    return null; // 問題がない場合は表示しない
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* 概要表示 */}
        <div
          className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            criticalIssues.length > 0
              ? 'border-l-4 border-l-red-500'
              : 'border-l-4 border-l-orange-500'
          }`}
          onClick={() => setShowDetailModal(true)}
        >
          <div className="relative">
            {criticalIssues.length > 0 ? (
              <AlertCircle className="h-6 w-6 text-red-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            )}
            {directionalityIssues.length > 1 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {directionalityIssues.length}
              </span>
            )}
          </div>

          <div className="flex-1">
            <h3
              className={`font-semibold ${
                criticalIssues.length > 0 ? 'text-red-800' : 'text-orange-800'
              }`}
            >
              Connection Directionality Issues Detected
            </h3>
            <div className="text-sm text-gray-600 mt-1">
              {criticalIssues.length > 0 && (
                <span className="text-red-600">
                  🚨 Critical: {criticalIssues.length} issues
                </span>
              )}
              {criticalIssues.length > 0 && warningIssues.length > 0 && (
                <span className="mx-2">•</span>
              )}
              {warningIssues.length > 0 && (
                <span className="text-orange-600">
                  ⚠️ Warning: {warningIssues.length} issues
                </span>
              )}
            </div>
          </div>

          <Info className="h-5 w-5 text-gray-400" />
        </div>

        {/* クイックプレビュー */}
        {directionalityIssues.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-gray-50 rounded-md p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Main Issues:
              </div>
              <div className="space-y-1">
                {directionalityIssues.slice(0, 2).map((issue, index) => (
                  <div
                    key={index}
                    className="text-sm text-gray-600 flex items-center gap-2"
                  >
                    {getIssueIcon(issue.result)}
                    <span className="truncate">
                      {issue.fromComponent.data?.title} →{' '}
                      {issue.toComponent.data?.title}
                    </span>
                  </div>
                ))}
                {directionalityIssues.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{directionalityIssues.length - 2} more issues
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {showDetailModal && (
        <DirectionalityDetailModal
          issues={directionalityIssues}
          onClose={() => setShowDetailModal(false)}
          onFixConnection={onFixConnection}
          enableAutoFix={enableAutoFix}
          onSelectIssue={setSelectedIssue}
          showUserFriendlyMessages={showUserFriendlyMessages}
        />
      )}
    </>
  );
};

interface DirectionalityDetailModalProps {
  issues: DirectionalityIssue[];
  onClose: () => void;
  onFixConnection?: (connectionId: string, suggestion: string) => void;
  enableAutoFix: boolean;
  onSelectIssue: (issue: DirectionalityIssue | null) => void;
  showUserFriendlyMessages?: boolean;
}

const DirectionalityDetailModal: React.FC<DirectionalityDetailModalProps> = ({
  issues,
  onClose,
  onFixConnection,
  enableAutoFix,
  // onSelectIssue,
  showUserFriendlyMessages = true,
}) => {
  const [activeTab, setActiveTab] = useState<'critical' | 'warning' | 'all'>(
    'all',
  );

  const filteredIssues = useMemo(() => {
    switch (activeTab) {
      case 'critical':
        return issues.filter((issue) => issue.result.severity === 'critical');
      case 'warning':
        return issues.filter((issue) => issue.result.severity === 'warning');
      default:
        return issues;
    }
  }, [issues, activeTab]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Connection Directionality Issues
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {issues.length} directionality issues detected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b">
          {[
            { key: 'all', label: 'All', count: issues.length },
            {
              key: 'critical',
              label: 'Critical',
              count: issues.filter((i) => i.result.severity === 'critical')
                .length,
            },
            {
              key: 'warning',
              label: 'Warning',
              count: issues.filter((i) => i.result.severity === 'warning')
                .length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto max-h-[60vh] p-6">
          <div className="space-y-4">
            {filteredIssues.map((issue, index) =>
              showUserFriendlyMessages ? (
                <UserFriendlyDirectionalityCard
                  key={`${issue.connection.id}-${index}`}
                  issue={issue}
                  onFixConnection={onFixConnection}
                  enableAutoFix={enableAutoFix}
                />
              ) : (
                <DirectionalityIssueCard
                  key={`${issue.connection.id}-${index}`}
                  issue={issue}
                  onFixConnection={onFixConnection}
                  enableAutoFix={enableAutoFix}
                />
              ),
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Connections requiring fixes:{' '}
              {issues.filter((i) => i.result.severity === 'critical').length}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DirectionalityIssueCardProps {
  issue: DirectionalityIssue;
  onFixConnection?: (connectionId: string, suggestion: string) => void;
  enableAutoFix: boolean;
}

const DirectionalityIssueCard: React.FC<DirectionalityIssueCardProps> = ({
  issue,
  onFixConnection,
  enableAutoFix,
}) => {
  const { result, connection, fromComponent, toComponent } = issue;

  return (
    <div
      className={`border rounded-lg p-4 ${
        result.severity === 'critical'
          ? 'border-red-200 bg-red-50'
          : 'border-orange-200 bg-orange-50'
      }`}
    >
      {/* 問題の概要 */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">{getIssueIcon(result)}</div>

        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-2">
            {fromComponent.data?.title} → {toComponent.data?.title}
          </h4>

          {/* 接続情報 */}
          <div className="text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-2">
              <span>Connection:</span>
              <code className="bg-white px-2 py-1 rounded text-xs">
                {connection.fromPort} → {connection.toPort}
              </code>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                {result.connectionType === 'power' ? 'Power' : 'Communication'}
              </span>
            </div>
          </div>

          {/* 問題の詳細 */}
          <div className="bg-white rounded-md p-3 mb-3">
            <div className="text-sm">
              <div className="font-medium text-gray-900 mb-1">Issue:</div>
              <div className="text-gray-700">{result.issue}</div>

              {result.recommendation && (
                <>
                  <div className="font-medium text-gray-900 mt-2 mb-1">
                    Recommendation:
                  </div>
                  <div className="text-gray-700">{result.recommendation}</div>
                </>
              )}
            </div>
          </div>

          {/* 詳細情報 */}
          {result.details && (
            <div className="text-xs text-gray-500 space-y-1">
              {result.details.fromRole && (
                <div>From Role: {result.details.fromRole}</div>
              )}
              {result.details.toRole && (
                <div>To Role: {result.details.toRole}</div>
              )}
              {result.details.protocol && (
                <div>Protocol: {result.details.protocol}</div>
              )}
              {result.details.voltageLevel && (
                <div>Voltage Level: {result.details.voltageLevel}</div>
              )}
            </div>
          )}

          {/* 自動修正ボタン */}
          {enableAutoFix && issue.autoFixSuggestion && onFixConnection && (
            <div className="mt-3">
              <button
                onClick={() =>
                  onFixConnection(connection.id, issue.autoFixSuggestion!)
                }
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Apply Auto Fix
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// User Friendly Directionality Card Component

interface UserFriendlyDirectionalityCardProps {
  issue: DirectionalityIssue;
  onFixConnection?: (connectionId: string, suggestion: string) => void;
  enableAutoFix: boolean;
}

const UserFriendlyDirectionalityCard: React.FC<
  UserFriendlyDirectionalityCardProps
> = ({ issue, onFixConnection, enableAutoFix }) => {
  const { result, connection, fromComponent, toComponent } = issue;

  const userFriendlyMessage = translateDirectionalityError(
    result,
    fromComponent.data?.title || 'Unknown Component',
    toComponent.data?.title || 'Unknown Component',
  );

  return (
    <div className="mb-4">
      <UserFriendlyErrorDisplay
        message={userFriendlyMessage}
        onQuickFix={() => {
          if (onFixConnection && issue.autoFixSuggestion) {
            onFixConnection(connection.id, issue.autoFixSuggestion);
          }
        }}
        onApplySolution={(solution) => {
          // Handle solution application
          console.log('Applying solution:', solution.title);
          if (onFixConnection && issue.autoFixSuggestion) {
            onFixConnection(connection.id, issue.autoFixSuggestion);
          }
        }}
        compact={false}
      />

      {/* Technical Details Toggle */}
      <details className="mt-2">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
          Show technical details
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
          <div className="space-y-1">
            <div>
              <span className="font-medium">Connection:</span>{' '}
              {connection.fromPort} → {connection.toPort}
            </div>
            <div>
              <span className="font-medium">Type:</span> {result.connectionType}
            </div>
            <div>
              <span className="font-medium">Direction:</span> {result.direction}
            </div>
            {result.details.fromRole && (
              <div>
                <span className="font-medium">From Role:</span>{' '}
                {result.details.fromRole}
              </div>
            )}
            {result.details.toRole && (
              <div>
                <span className="font-medium">To Role:</span>{' '}
                {result.details.toRole}
              </div>
            )}
            {result.details.protocol && (
              <div>
                <span className="font-medium">Protocol:</span>{' '}
                {result.details.protocol}
              </div>
            )}
            {result.details.voltageLevel && (
              <div>
                <span className="font-medium">Voltage Level:</span>{' '}
                {result.details.voltageLevel}
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};

// Helper Functions

function getIssueIcon(result: DirectionalityResult) {
  if (result.connectionType === 'power') {
    return (
      <Zap
        className={`h-5 w-5 ${
          result.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
        }`}
      />
    );
  } else {
    return (
      <Radio
        className={`h-5 w-5 ${
          result.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
        }`}
      />
    );
  }
}

function generateAutoFixSuggestion(
  result: DirectionalityResult,
): string | undefined {
  if (result.connectionType === 'power' && result.direction === 'invalid') {
    return 'reverse_connection'; // 接続を逆にする
  }

  if (result.details.voltageLevel && result.recommendation?.includes('変換')) {
    return 'add_level_shifter'; // レベルシフターを追加
  }

  return undefined;
}

export default DirectionalityWarning;
