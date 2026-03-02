'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Activity,
  TrendingUp,
} from 'lucide-react';
import type { Connection, NodeData } from '@/types';
import type { Node } from '@xyflow/react';
import { UserFriendlyErrorDisplay } from './UserFriendlyErrorDisplay';
import { translateUnconnectedMessage } from '@/utils/ui/userFriendlyMessages';

export interface UnconnectedPartsWarningProps {
  components: Node<NodeData>[];
  connections: Connection[];
  onRecommendConnection?: (
    componentId: string,
    recommendedConnections: string[],
  ) => void;
  enableRealTimeMonitoring?: boolean;
  showConnectionHistory?: boolean;
  showUserFriendlyMessages?: boolean;
}

interface UnconnectedComponent {
  id: string;
  title: string;
  voltage?: string;
  communication?: string;
  recommendedConnections: string[];
}

interface ConnectionStatus {
  timestamp: number;
  connectionRate: number;
  totalComponents: number;
  connectedComponents: number;
  // newConnections: string[]
  // removedConnections: string[]
}

interface UnconnectedPartsAnalysis {
  unconnectedComponents: UnconnectedComponent[];
  connectedComponentIds: Set<string>;
  totalComponents: number;
  connectionRate: number;
  connectionHistory: ConnectionStatus[];
  isFullyConnected: boolean;
  lastUpdated: number;
}

export const UnconnectedPartsWarning: React.FC<
  UnconnectedPartsWarningProps
> = ({
  components,
  connections,
  onRecommendConnection,
  enableRealTimeMonitoring = true,
  showConnectionHistory = false,
  showUserFriendlyMessages = true,
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<
    ConnectionStatus[]
  >([]);
  const [lastConnectionCount, setLastConnectionCount] = useState(0);
  const [isConnectivityImproving, setIsConnectivityImproving] = useState(false);
  const prevAnalysisRef = useRef<UnconnectedPartsAnalysis | null>(null);

  const analysis = useMemo((): UnconnectedPartsAnalysis => {
    const connectedComponentIds = new Set<string>();

    connections.forEach((connection) => {
      connectedComponentIds.add(connection.fromId);
      connectedComponentIds.add(connection.toId);
    });

    const unconnectedComponents: UnconnectedComponent[] = components
      .filter((component) => !connectedComponentIds.has(component.id))
      .map((component) => ({
        id: component.id,
        title: component.data?.title || 'Unknown Component',
        voltage: component.data?.voltage,
        communication: component.data?.communication,
        recommendedConnections: generateRecommendedConnections(
          component,
          components,
          connectedComponentIds,
        ),
      }));

    const connectionRate =
      components.length > 0
        ? Math.round((connectedComponentIds.size / components.length) * 100)
        : 100;

    const isFullyConnected =
      components.length > 0 && unconnectedComponents.length === 0;
    const now = Date.now();

    // 接続状態の変化を検出
    const prevAnalysis = prevAnalysisRef.current;
    // const newConnections: string[] = []
    // const removedConnections: string[] = []

    if (prevAnalysis && enableRealTimeMonitoring) {
      // const currentConnectionIds = new Set(connections.map(c => c.id))
      // const prevConnectionIds = new Set(prevAnalysis.connectionHistory[0]?.newConnections || [])
      // newConnections = connections
      //   .filter(c => !prevConnectionIds.has(c.id))
      //   .map(c => c.id)
      // 削除された接続の検出（実装簡略化）
      // removedConnections = []
    }

    return {
      unconnectedComponents,
      connectedComponentIds,
      totalComponents: components.length,
      connectionRate,
      connectionHistory: connectionHistory,
      isFullyConnected,
      lastUpdated: now,
    };
  }, [components, connections, connectionHistory, enableRealTimeMonitoring]);

  // リアルタイム監視とヒストリー管理
  useEffect(() => {
    if (!enableRealTimeMonitoring) return;

    const prevAnalysis = prevAnalysisRef.current;
    const currentConnectionCount = connections.length;

    // 接続状態の変化を検出
    if (
      prevAnalysis &&
      (currentConnectionCount !== lastConnectionCount ||
        analysis.connectionRate !== prevAnalysis.connectionRate)
    ) {
      const newStatus: ConnectionStatus = {
        timestamp: Date.now(),
        connectionRate: analysis.connectionRate,
        totalComponents: analysis.totalComponents,
        connectedComponents: analysis.connectedComponentIds.size,
        // newConnections: connections.map(c => c.id),
        // removedConnections: []
      };

      setConnectionHistory((prev) => [newStatus, ...prev.slice(0, 9)]); // 最新10件を保持
      setLastConnectionCount(currentConnectionCount);

      // 接続性改善の検出
      if (analysis.connectionRate > (prevAnalysis.connectionRate || 0)) {
        setIsConnectivityImproving(true);
        setTimeout(() => setIsConnectivityImproving(false), 3000); // 3秒後にリセット
      }
    }

    prevAnalysisRef.current = analysis;
  }, [
    analysis,
    connections.length,
    lastConnectionCount,
    enableRealTimeMonitoring,
  ]);

  // 全部品接続済みの場合の拡張表示
  if (analysis.unconnectedComponents.length === 0) {
    return (
      <div
        className={`flex items-center gap-2 p-3 rounded-lg transition-all duration-500 ${
          isConnectivityImproving
            ? 'bg-green-100 border-2 border-green-300 shadow-lg'
            : 'bg-green-50 border border-green-200'
        }`}
      >
        <div className="relative">
          <CheckCircle
            className={`h-5 w-5 text-green-600 transition-transform duration-300 ${
              isConnectivityImproving ? 'scale-110' : 'scale-100'
            }`}
          />
          {enableRealTimeMonitoring && (
            <Activity className="h-3 w-3 text-green-500 absolute -top-1 -right-1 animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <span className="text-green-800 font-medium">
            ✅ All Components Connected ({analysis.totalComponents} components)
          </span>
          {enableRealTimeMonitoring && (
            <div className="text-xs text-green-700 mt-1 flex items-center gap-2">
              <span>Connection Rate: 100%</span>
              <span>•</span>
              <span>Connections: {connections.length}</span>
              {isConnectivityImproving && (
                <>
                  <span>•</span>
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-green-600 font-medium">Improving</span>
                </>
              )}
            </div>
          )}
        </div>
        {showConnectionHistory && connectionHistory.length > 0 && (
          <button
            onClick={() => setShowDetailModal(true)}
            className="text-green-600 hover:text-green-800 transition-colors"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all duration-300 ${
          isConnectivityImproving
            ? 'bg-yellow-50 border border-yellow-300 hover:bg-yellow-100'
            : 'bg-orange-50 border border-orange-200 hover:bg-orange-100'
        }`}
        onClick={() => setShowDetailModal(true)}
      >
        <div className="relative">
          <AlertTriangle
            className={`h-5 w-5 transition-colors duration-300 ${
              isConnectivityImproving ? 'text-yellow-600' : 'text-orange-600'
            }`}
          />
          {enableRealTimeMonitoring && (
            <Activity className="h-3 w-3 text-blue-500 absolute -top-1 -right-1 animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <span
            className={`font-medium transition-colors duration-300 ${
              isConnectivityImproving ? 'text-yellow-800' : 'text-orange-800'
            }`}
          >
            Unconnected Components Detected
            {isConnectivityImproving && (
              <span className="ml-2 text-green-600 text-sm">📈 Improving</span>
            )}
          </span>
          <div
            className={`text-sm mt-1 transition-colors duration-300 ${
              isConnectivityImproving ? 'text-yellow-700' : 'text-orange-700'
            }`}
          >
            {analysis.unconnectedComponents.length} unconnected components
            (Connection Rate: {analysis.connectionRate}%)
            {enableRealTimeMonitoring && connections.length > 0 && (
              <span className="ml-2">• {connections.length} connections</span>
            )}
          </div>
        </div>
        <Info
          className={`h-4 w-4 transition-colors duration-300 ${
            isConnectivityImproving ? 'text-yellow-600' : 'text-orange-600'
          }`}
        />
      </div>

      {showDetailModal && (
        <UnconnectedPartsDetailModal
          analysis={analysis}
          connectionHistory={connectionHistory}
          showConnectionHistory={showConnectionHistory}
          enableRealTimeMonitoring={enableRealTimeMonitoring}
          showUserFriendlyMessages={showUserFriendlyMessages}
          onClose={() => setShowDetailModal(false)}
          onRecommendConnection={onRecommendConnection}
        />
      )}
    </>
  );
};

interface UnconnectedPartsDetailModalProps {
  analysis: UnconnectedPartsAnalysis;
  connectionHistory: ConnectionStatus[];
  showConnectionHistory: boolean;
  enableRealTimeMonitoring: boolean;
  showUserFriendlyMessages?: boolean;
  onClose: () => void;
  onRecommendConnection?: (
    componentId: string,
    recommendedConnections: string[],
  ) => void;
}

const UnconnectedPartsDetailModal: React.FC<
  UnconnectedPartsDetailModalProps
> = ({
  analysis,
  connectionHistory,
  showConnectionHistory,
  enableRealTimeMonitoring,
  showUserFriendlyMessages = true,
  onClose,
  onRecommendConnection,
}) => {
  const [activeTab, setActiveTab] = useState<'components' | 'history'>(
    'components',
  );
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {analysis.isFullyConnected
                  ? 'Connection Status Details'
                  : 'Unconnected Components Details'}
              </h2>
              {enableRealTimeMonitoring && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full">
                  <Activity className="h-3 w-3 text-blue-600 animate-pulse" />
                  <span className="text-xs text-blue-800">
                    Real-time Monitoring
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {analysis.isFullyConnected
                ? `All ${analysis.totalComponents} components connected (Connection rate: ${analysis.connectionRate}%)`
                : `${analysis.unconnectedComponents.length} components are not connected (Connection rate: ${analysis.connectionRate}%)`}
            </p>

            {/* タブ切り替え */}
            {showConnectionHistory && connectionHistory.length > 0 && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setActiveTab('components')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeTab === 'components'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Component Details
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeTab === 'history'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Connection History ({connectionHistory.length})
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          <div className="p-6">
            {activeTab === 'components' ? (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">
                      Connected: {analysis.connectedComponentIds.size}{' '}
                      components
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">
                      Unconnected: {analysis.unconnectedComponents.length}{' '}
                      components
                    </span>
                  </div>
                </div>

                {analysis.isFullyConnected ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-800 mb-2">
                      All components are connected
                    </h3>
                    <p className="text-green-600">
                      All {analysis.totalComponents} components are properly
                      connected
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysis.unconnectedComponents.map((component) =>
                      showUserFriendlyMessages ? (
                        <UserFriendlyUnconnectedCard
                          key={component.id}
                          component={component}
                          totalComponents={analysis.totalComponents}
                          unconnectedCount={
                            analysis.unconnectedComponents.length
                          }
                          onRecommendConnection={onRecommendConnection}
                        />
                      ) : (
                        <UnconnectedComponentCard
                          key={component.id}
                          component={component}
                          onRecommendConnection={onRecommendConnection}
                        />
                      ),
                    )}
                  </div>
                )}
              </>
            ) : (
              <ConnectionHistoryView
                connectionHistory={connectionHistory}
                enableRealTimeMonitoring={enableRealTimeMonitoring}
              />
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Connection Rate: {analysis.connectionRate}% (
              {analysis.connectedComponentIds.size}/{analysis.totalComponents})
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

interface UnconnectedComponentCardProps {
  component: UnconnectedComponent;
  onRecommendConnection?: (
    componentId: string,
    recommendedConnections: string[],
  ) => void;
}

interface UserFriendlyUnconnectedCardProps {
  component: UnconnectedComponent;
  totalComponents: number;
  unconnectedCount: number;
  onRecommendConnection?: (
    componentId: string,
    recommendedConnections: string[],
  ) => void;
}

const UnconnectedComponentCard: React.FC<UnconnectedComponentCardProps> = ({
  component,
  onRecommendConnection,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{component.title}</h3>
          <div className="mt-2 space-y-1">
            {component.voltage && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Voltage:</span>{' '}
                {component.voltage}
              </div>
            )}
            {component.communication && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Communication:</span>{' '}
                {component.communication}
              </div>
            )}
          </div>
        </div>
        <div className="ml-4">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
        </div>
      </div>

      {component.recommendedConnections.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Recommended Connections:
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {component.recommendedConnections.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
          {onRecommendConnection && (
            <button
              onClick={() =>
                onRecommendConnection(
                  component.id,
                  component.recommendedConnections,
                )
              }
              className="mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Apply Connection
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const UserFriendlyUnconnectedCard: React.FC<
  UserFriendlyUnconnectedCardProps
> = ({
  component,
  totalComponents,
  unconnectedCount,
  onRecommendConnection,
}) => {
  const userFriendlyMessage = translateUnconnectedMessage(
    component.title,
    totalComponents,
    unconnectedCount,
    component.recommendedConnections,
  );

  return (
    <div className="mb-4">
      <UserFriendlyErrorDisplay
        message={userFriendlyMessage}
        onQuickFix={() => {
          if (onRecommendConnection) {
            onRecommendConnection(
              component.id,
              component.recommendedConnections,
            );
          }
        }}
        onApplySolution={(solution) => {
          console.log('Applying connection solution:', solution.title);
          if (onRecommendConnection) {
            onRecommendConnection(
              component.id,
              component.recommendedConnections,
            );
          }
        }}
        compact={true}
      />

      {/* Component Details */}
      <details className="mt-2">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
          Show component details
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
          <div className="space-y-1">
            <div>
              <span className="font-medium">Component:</span> {component.title}
            </div>
            {component.voltage && (
              <div>
                <span className="font-medium">Voltage:</span>{' '}
                {component.voltage}
              </div>
            )}
            {component.communication && (
              <div>
                <span className="font-medium">Communication:</span>{' '}
                {component.communication}
              </div>
            )}
            {component.recommendedConnections.length > 0 && (
              <div>
                <span className="font-medium">Recommendations:</span>
                <ul className="mt-1 ml-4">
                  {component.recommendedConnections.map((rec, index) => (
                    <li key={index} className="text-xs text-gray-600">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};

function generateRecommendedConnections(
  unconnectedComponent: Node<NodeData>,
  allComponents: Node<NodeData>[],
  connectedComponentIds: Set<string>,
): string[] {
  const recommendations: string[] = [];

  const componentVoltage = unconnectedComponent.data?.voltage;
  const componentComm = unconnectedComponent.data?.communication?.toLowerCase();

  const connectedComponents = allComponents.filter((comp) =>
    connectedComponentIds.has(comp.id),
  );

  connectedComponents.forEach((connectedComp) => {
    const targetVoltage = connectedComp.data?.voltage;
    const targetComm = connectedComp.data?.communication?.toLowerCase();

    if (componentVoltage && targetVoltage) {
      if (componentVoltage === targetVoltage) {
        recommendations.push(
          `Power connection with ${connectedComp.data?.title} (${componentVoltage})`,
        );
      } else {
        recommendations.push(
          `Power connection with ${connectedComp.data?.title} (Voltage conversion: ${targetVoltage} → ${componentVoltage})`,
        );
      }
    }

    if (componentComm && targetComm) {
      const commonProtocols = findCommonProtocols(componentComm, targetComm);
      if (commonProtocols.length > 0) {
        recommendations.push(
          `${commonProtocols[0].toUpperCase()} communication with ${connectedComp.data?.title}`,
        );
      }
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('Consider connection paths with other components');
    if (componentVoltage) {
      recommendations.push(
        `${componentVoltage} connection with power supply components`,
      );
    }
    if (componentComm) {
      recommendations.push(
        `Connection with ${componentComm} communication compatible components`,
      );
    }
  }

  return recommendations.slice(0, 3);
}

function findCommonProtocols(comm1: string, comm2: string): string[] {
  const protocols = ['i2c', 'spi', 'uart', 'can', 'pwm', 'digital', 'analog'];
  return protocols.filter(
    (protocol) => comm1.includes(protocol) && comm2.includes(protocol),
  );
}

interface ConnectionHistoryViewProps {
  connectionHistory: ConnectionStatus[];
  enableRealTimeMonitoring: boolean;
}

const ConnectionHistoryView: React.FC<ConnectionHistoryViewProps> = ({
  connectionHistory,
  enableRealTimeMonitoring,
}) => {
  if (connectionHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          No connection history
        </h3>
        <p className="text-gray-500">
          History will be displayed here when components are connected or
          removed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-blue-600" />
        <h3 className="font-medium text-gray-900">Connection History</h3>
        {enableRealTimeMonitoring && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            Real-time updating
          </span>
        )}
      </div>

      <div className="space-y-3">
        {connectionHistory.map((status, index) => (
          <div
            key={status.timestamp}
            className={`p-4 rounded-lg border ${
              index === 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    status.connectionRate === 100
                      ? 'bg-green-500'
                      : status.connectionRate > 50
                        ? 'bg-yellow-500'
                        : 'bg-orange-500'
                  }`}
                />
                <span className="text-sm font-medium">
                  Connection Rate: {status.connectionRate}%
                </span>
                {index === 0 && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                    Latest
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(status.timestamp).toLocaleTimeString('ja-JP')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Components:</span>
                <span className="ml-2 font-medium">
                  {status.totalComponents}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Connected:</span>
                <span className="ml-2 font-medium">
                  {status.connectedComponents}
                </span>
              </div>
            </div>

            {/* {status.newConnections.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                Connections: {status.newConnections.length}
              </div>
            )} */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnconnectedPartsWarning;
