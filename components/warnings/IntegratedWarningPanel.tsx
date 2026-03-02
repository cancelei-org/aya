'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Connection, NodeData } from '@/types';
import type { Node } from '@xyflow/react';
import { UnconnectedPartsWarning } from './UnconnectedPartsWarning';
import { DirectionalityWarning } from './DirectionalityWarning';
import { PowerCapacityWarning } from './PowerCapacityWarning';
import { ConnectionDirectionalityManager } from '@/utils/connections/validation/connectionDirectionalityManager';

export interface IntegratedWarningPanelProps {
  connections: Connection[];
  components: Node<NodeData>[];
  onFixConnection?: (connectionId: string, suggestion: string) => void;
  onRecommendConnection?: (
    componentId: string,
    recommendations: string[],
  ) => void;
  onRecommendSolution?: (connectionId: string, recommendation: string) => void;
  enableAutoFix?: boolean;
  showUserFriendlyMessages?: boolean;
}

interface WarningSystemStatus {
  type: 'unconnected' | 'directionality' | 'power_capacity';
  severity: 'info' | 'warning' | 'critical';
  count: number;
  title: string;
  priority: number;
}

export const IntegratedWarningPanel: React.FC<IntegratedWarningPanelProps> = ({
  connections,
  components,
  onFixConnection,
  onRecommendConnection,
  onRecommendSolution,
  enableAutoFix = true,
  showUserFriendlyMessages = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    'all' | 'unconnected' | 'directionality' | 'power_capacity'
  >('all');
  const [showSettings, setShowSettings] = useState(false);

  // Analyze all warning systems
  const warningStatus = useMemo((): WarningSystemStatus[] => {
    const status: WarningSystemStatus[] = [];

    // Unconnected components analysis
    const connectedComponentIds = new Set<string>();
    connections.forEach((connection) => {
      connectedComponentIds.add(connection.fromId);
      connectedComponentIds.add(connection.toId);
    });
    const unconnectedCount = components.length - connectedComponentIds.size;

    if (unconnectedCount > 0) {
      status.push({
        type: 'unconnected',
        severity:
          unconnectedCount > components.length * 0.5 ? 'critical' : 'warning',
        count: unconnectedCount,
        title: `${unconnectedCount} Unconnected Components`,
        priority: 1,
      });
    }

    // Directionality issues analysis
    const manager = ConnectionDirectionalityManager.getInstance();

    let directionalityIssues = 0;
    let criticalDirectionalityIssues = 0;

    connections.forEach((connection) => {
      const fromComponent = components.find((c) => c.id === connection.fromId);
      const toComponent = components.find((c) => c.id === connection.toId);

      if (fromComponent && toComponent) {
        const result = manager.validateConnectionDirectionality(
          connection,
          fromComponent,
          toComponent,
        );
        if (!result.isValid || result.severity === 'warning') {
          directionalityIssues++;
          if (result.severity === 'critical') {
            criticalDirectionalityIssues++;
          }
        }
      }
    });

    if (directionalityIssues > 0) {
      status.push({
        type: 'directionality',
        severity: criticalDirectionalityIssues > 0 ? 'critical' : 'warning',
        count: directionalityIssues,
        title: `${directionalityIssues} Connection Issues`,
        priority: criticalDirectionalityIssues > 0 ? 0 : 2,
      });
    }

    // Power capacity issues analysis
    let powerIssues = 0;
    let criticalPowerIssues = 0;

    connections.forEach((connection) => {
      const fromComponent = components.find((c) => c.id === connection.fromId);
      const toComponent = components.find((c) => c.id === connection.toId);

      if (fromComponent && toComponent) {
        const connectionType = determinePowerConnection(connection);
        if (connectionType === 'power') {
          const result = manager.validateConnectionDirectionality(
            connection,
            fromComponent,
            toComponent,
          );
          if (
            result.details.powerCapacity &&
            !result.details.powerCapacity.isAdequate
          ) {
            powerIssues++;
            if (result.details.powerCapacity.shortfall! > 100) {
              criticalPowerIssues++;
            }
          }
        }
      }
    });

    if (powerIssues > 0) {
      status.push({
        type: 'power_capacity',
        severity: criticalPowerIssues > 0 ? 'critical' : 'warning',
        count: powerIssues,
        title: `${powerIssues} Power Issues`,
        priority: criticalPowerIssues > 0 ? 0 : 3,
      });
    }

    // Sort by priority (critical issues first)
    return status.sort((a, b) => a.priority - b.priority);
  }, [connections, components]);

  const totalIssues = warningStatus.reduce(
    (sum, status) => sum + status.count,
    0,
  );
  const criticalIssues = warningStatus.filter(
    (status) => status.severity === 'critical',
  ).length;
  const hasAnyIssues = totalIssues > 0;

  // Perfect system display
  if (!hasAnyIssues) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-800">
              ✅ Perfect System Design
            </h3>
            <p className="text-sm text-green-700 mt-1">
              All {components.length} components are properly connected with{' '}
              {connections.length} valid connections
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Integrated Header */}
      <div
        className={`flex items-center justify-between ${isExpanded ? 'p-4' : 'p-3'} cursor-pointer hover:bg-gray-50 transition-colors ${
          criticalIssues > 0
            ? 'border-l-4 border-l-red-500'
            : 'border-l-4 border-l-orange-500'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {criticalIssues > 0 ? (
              <AlertCircle
                className={`${isExpanded ? 'h-6 w-6' : 'h-5 w-5'} text-red-600`}
              />
            ) : (
              <AlertTriangle
                className={`${isExpanded ? 'h-6 w-6' : 'h-5 w-5'} text-orange-600`}
              />
            )}
            <span
              className={`absolute ${isExpanded ? '-top-2 -right-2 h-5 w-5 text-xs' : '-top-1 -right-1 h-4 w-4 text-[10px]'} bg-red-500 text-white rounded-full flex items-center justify-center`}
            >
              {totalIssues}
            </span>
          </div>

          <div className="flex-1">
            <h3
              className={`font-semibold ${
                criticalIssues > 0 ? 'text-red-800' : 'text-orange-800'
              } ${!isExpanded ? 'text-sm' : ''}`}
            >
              System Issues Detected
            </h3>
            {isExpanded && (
              <div className="text-sm text-gray-600 mt-1">
                {criticalIssues > 0 && (
                  <span className="text-red-600 font-medium">
                    🚨 {criticalIssues} Critical •
                  </span>
                )}
                <span className="text-orange-600">
                  {totalIssues - criticalIssues} Warnings
                </span>
                <span className="mx-2">•</span>
                <span>
                  {components.length} Components • {connections.length}{' '}
                  Connections
                </span>
              </div>
            )}
            {!isExpanded && (
              <div className="text-xs text-gray-500">
                {totalIssues} issue{totalIssues !== 1 ? 's' : ''} • Click to
                expand
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <Settings className="h-4 w-4 text-gray-500" />
          </button>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Quick Summary - Removed to make collapsed state more compact */}

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Tab Navigation */}
          <div className="border-t border-gray-200 flex overflow-x-auto">
            {[
              { key: 'all', label: 'All Issues', count: totalIssues },
              ...warningStatus.map((status) => ({
                key: status.type,
                label: getTabLabel(status.type),
                count: status.count,
              })),
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  selectedTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="p-4 space-y-4">
            {(selectedTab === 'all' || selectedTab === 'unconnected') &&
              warningStatus.some((s) => s.type === 'unconnected') && (
                <UnconnectedPartsWarning
                  components={components}
                  connections={connections}
                  enableRealTimeMonitoring={true}
                  showConnectionHistory={false}
                  showUserFriendlyMessages={showUserFriendlyMessages}
                  onRecommendConnection={onRecommendConnection}
                />
              )}

            {(selectedTab === 'all' || selectedTab === 'directionality') &&
              warningStatus.some((s) => s.type === 'directionality') && (
                <DirectionalityWarning
                  connections={connections}
                  components={components}
                  enableAutoFix={enableAutoFix}
                  showUserFriendlyMessages={showUserFriendlyMessages}
                  onFixConnection={onFixConnection}
                />
              )}

            {(selectedTab === 'all' || selectedTab === 'power_capacity') &&
              warningStatus.some((s) => s.type === 'power_capacity') && (
                <PowerCapacityWarning
                  connections={connections}
                  components={components}
                  enableDetailedAnalysis={true}
                  onRecommendSolution={onRecommendSolution}
                />
              )}
          </div>

          {/* One-Click Fix Panel */}
          <OneClickFixPanel
            warningStatus={warningStatus}
            onFixConnection={onFixConnection}
            onRecommendConnection={onRecommendConnection}
            onRecommendSolution={onRecommendSolution}
            connections={connections}
            components={components}
          />
        </>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <WarningSettingsPanel
          onClose={() => setShowSettings(false)}
          showUserFriendlyMessages={showUserFriendlyMessages}
          enableAutoFix={enableAutoFix}
        />
      )}
    </div>
  );
};

// Helper Components

interface OneClickFixPanelProps {
  warningStatus: WarningSystemStatus[];
  onFixConnection?: (connectionId: string, suggestion: string) => void;
  onRecommendConnection?: (
    componentId: string,
    recommendations: string[],
  ) => void;
  onRecommendSolution?: (connectionId: string, recommendation: string) => void;
  connections: Connection[];
  components: Node<NodeData>[];
}

const OneClickFixPanel: React.FC<OneClickFixPanelProps> = ({
  warningStatus,
  onFixConnection,
  onRecommendConnection,
  // onRecommendSolution,
  connections,
  components,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const fixableIssues = warningStatus.filter(
    (status) =>
      status.type === 'directionality' || status.type === 'unconnected',
  );

  if (fixableIssues.length === 0) return null;

  return (
    <div className="border-t border-gray-200 bg-blue-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-800">
            🚀 Quick Fix Available
          </span>
          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
            {fixableIssues.length} auto-fixable
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-blue-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-blue-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {fixableIssues.map((status, index) => (
            <button
              key={index}
              onClick={() =>
                handleQuickFix(
                  status,
                  connections,
                  components,
                  onFixConnection,
                  onRecommendConnection,
                )
              }
              className="w-full p-3 bg-white border border-blue-200 rounded-lg text-left hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-blue-900">
                    Fix {status.title}
                  </div>
                  <div className="text-sm text-blue-700">
                    {getQuickFixDescription(status.type)}
                  </div>
                </div>
                <div className="text-blue-600 font-medium">Apply →</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface WarningSettingsPanelProps {
  onClose: () => void;
  showUserFriendlyMessages: boolean;
  enableAutoFix: boolean;
}

const WarningSettingsPanel: React.FC<WarningSettingsPanelProps> = ({
  onClose,
  showUserFriendlyMessages,
  enableAutoFix,
}) => (
  <div className="border-t border-gray-200 bg-gray-50 p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-medium text-gray-900">Warning Settings</h4>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X className="h-4 w-4" />
      </button>
    </div>
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span>User-friendly messages</span>
        <span
          className={`px-2 py-1 rounded ${showUserFriendlyMessages ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
        >
          {showUserFriendlyMessages ? 'ON' : 'OFF'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span>Auto-fix suggestions</span>
        <span
          className={`px-2 py-1 rounded ${enableAutoFix ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
        >
          {enableAutoFix ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  </div>
);

// Helper Functions

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getSeverityIcon(status: WarningSystemStatus) {
  switch (status.severity) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    default:
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
  }
}

function getTabLabel(type: string): string {
  switch (type) {
    case 'unconnected':
      return 'Unconnected';
    case 'directionality':
      return 'Connections';
    case 'power_capacity':
      return 'Power';
    default:
      return 'Other';
  }
}

function getQuickFixDescription(type: string): string {
  switch (type) {
    case 'unconnected':
      return 'Auto-connect components with recommended connections';
    case 'directionality':
      return 'Fix connection directions and add level shifters';
    case 'power_capacity':
      return 'Suggest power supply upgrades';
    default:
      return 'Apply automated fixes';
  }
}

function handleQuickFix(
  status: WarningSystemStatus,
  connections: Connection[],
  components: Node<NodeData>[],
  onFixConnection?: (connectionId: string, suggestion: string) => void,
  onRecommendConnection?: (
    componentId: string,
    recommendations: string[],
  ) => void,
) {
  console.log(`Applying quick fix for ${status.type}:`, status.count, 'issues');

  switch (status.type) {
    case 'unconnected':
      // Auto-connect unconnected components
      const connectedIds = new Set<string>();
      connections.forEach((conn) => {
        connectedIds.add(conn.fromId);
        connectedIds.add(conn.toId);
      });

      const unconnectedComponents = components.filter(
        (comp) => !connectedIds.has(comp.id),
      );
      unconnectedComponents.forEach((comp) => {
        if (onRecommendConnection) {
          onRecommendConnection(comp.id, ['Auto-connect to main circuit']);
        }
      });
      break;

    case 'directionality':
      // Fix connection directions
      connections.forEach((conn) => {
        if (onFixConnection) {
          onFixConnection(conn.id, 'auto_fix_direction');
        }
      });
      break;
  }
}

function determinePowerConnection(
  connection: Connection,
): 'power' | 'communication' {
  const powerPorts = [
    'vcc',
    'gnd',
    'power',
    '5v',
    '3.3v',
    'vin',
    'vout',
    '+',
    '-',
  ];
  const ports = [connection.fromPort, connection.toPort].map((p) =>
    p.toLowerCase(),
  );

  const isPowerConnection = ports.some((port) =>
    powerPorts.some((pp) => port.includes(pp)),
  );

  return isPowerConnection ? 'power' : 'communication';
}

export default IntegratedWarningPanel;
