'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Zap,
  Battery,
  Cpu,
  Info,
  X,
  AlertCircle,
} from 'lucide-react';
import type { Connection, NodeData } from '@/types';
import type { Node } from '@xyflow/react';
import type { PowerCapacityInfo } from '@/utils/connections/validation/connectionDirectionalityManager';
import { ConnectionDirectionalityManager } from '@/utils/connections/validation/connectionDirectionalityManager';

export interface PowerCapacityWarningProps {
  connections: Connection[];
  components: Node<NodeData>[];
  onRecommendSolution?: (connectionId: string, recommendation: string) => void;
  enableDetailedAnalysis?: boolean;
}

interface PowerCapacityIssue {
  connection: Connection;
  fromComponent: Node<NodeData>;
  toComponent: Node<NodeData>;
  powerInfo: PowerCapacityInfo;
  severity: 'warning' | 'critical';
  voltageIssue?: {
    fromVoltage: number;
    toVoltage: number;
    requiresRegulator: boolean;
    recommendedIC?: string;
  };
}

export const PowerCapacityWarning: React.FC<PowerCapacityWarningProps> = ({
  connections,
  components,
  onRecommendSolution,
  enableDetailedAnalysis = true,
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const powerCapacityIssues = useMemo((): PowerCapacityIssue[] => {
    const manager = ConnectionDirectionalityManager.getInstance();
    const issues: PowerCapacityIssue[] = [];

    connections.forEach((connection) => {
      const fromComponent = components.find((c) => c.id === connection.fromId);
      const toComponent = components.find((c) => c.id === connection.toId);

      if (!fromComponent || !toComponent) return;

      // Only check power connections
      const connectionType = determinePowerConnection(connection);
      if (connectionType !== 'power') return;

      const result = manager.validateConnectionDirectionality(
        connection,
        fromComponent,
        toComponent,
      );

      // Check for power capacity issues
      if (
        result.details.powerCapacity &&
        !result.details.powerCapacity.isAdequate
      ) {
        const voltageIssue = analyzeVoltageCompatibility(
          fromComponent,
          toComponent,
        );

        issues.push({
          connection,
          fromComponent,
          toComponent,
          powerInfo: result.details.powerCapacity,
          severity:
            result.details.powerCapacity.shortfall! > 100
              ? 'critical'
              : 'warning',
          voltageIssue,
        });
      }
    });

    return issues;
  }, [connections, components]);

  const criticalIssues = powerCapacityIssues.filter(
    (issue) => issue.severity === 'critical',
  );
  const warningIssues = powerCapacityIssues.filter(
    (issue) => issue.severity === 'warning',
  );

  if (powerCapacityIssues.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Overview Display */}
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
            <Zap className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1" />
          </div>

          <div className="flex-1">
            <h3
              className={`font-semibold ${
                criticalIssues.length > 0 ? 'text-red-800' : 'text-orange-800'
              }`}
            >
              Power Capacity Issues Detected
            </h3>
            <div className="text-sm text-gray-600 mt-1">
              {criticalIssues.length > 0 && (
                <span className="text-red-600">
                  ⚡ Critical: {criticalIssues.length} power shortages
                </span>
              )}
              {criticalIssues.length > 0 && warningIssues.length > 0 && (
                <span className="mx-2">•</span>
              )}
              {warningIssues.length > 0 && (
                <span className="text-orange-600">
                  ⚠️ Warning: {warningIssues.length} capacity concerns
                </span>
              )}
            </div>
          </div>

          <Info className="h-5 w-5 text-gray-400" />
        </div>

        {/* Quick Preview */}
        {powerCapacityIssues.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-gray-50 rounded-md p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Power Issues:
              </div>
              <div className="space-y-1">
                {powerCapacityIssues.slice(0, 2).map((issue, index) => (
                  <div
                    key={index}
                    className="text-sm text-gray-600 flex items-center gap-2"
                  >
                    {getPowerIssueIcon({ issue })}
                    <span className="truncate">
                      {issue.fromComponent.data?.title} →{' '}
                      {issue.toComponent.data?.title}
                    </span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      -{issue.powerInfo.shortfall}mA
                    </span>
                  </div>
                ))}
                {powerCapacityIssues.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{powerCapacityIssues.length - 2} more power issues
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <PowerCapacityDetailModal
          issues={powerCapacityIssues}
          onClose={() => setShowDetailModal(false)}
          onRecommendSolution={onRecommendSolution}
          enableDetailedAnalysis={enableDetailedAnalysis}
        />
      )}
    </>
  );
};

interface PowerCapacityDetailModalProps {
  issues: PowerCapacityIssue[];
  onClose: () => void;
  onRecommendSolution?: (connectionId: string, recommendation: string) => void;
  enableDetailedAnalysis: boolean;
}

const PowerCapacityDetailModal: React.FC<PowerCapacityDetailModalProps> = ({
  issues,
  onClose,
  onRecommendSolution,
  enableDetailedAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<'critical' | 'warning' | 'all'>(
    'all',
  );

  const filteredIssues = useMemo(() => {
    switch (activeTab) {
      case 'critical':
        return issues.filter((issue) => issue.severity === 'critical');
      case 'warning':
        return issues.filter((issue) => issue.severity === 'warning');
      default:
        return issues;
    }
  }, [issues, activeTab]);

  const totalShortfall = issues.reduce(
    (sum, issue) => sum + (issue.powerInfo.shortfall || 0),
    0,
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Power Capacity Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {issues.length} power capacity issues detected • Total shortage:{' '}
              {totalShortfall}mA
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'all', label: 'All Issues', count: issues.length },
            {
              key: 'critical',
              label: 'Critical',
              count: issues.filter((i) => i.severity === 'critical').length,
            },
            {
              key: 'warning',
              label: 'Warning',
              count: issues.filter((i) => i.severity === 'warning').length,
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

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-6">
          <div className="space-y-4">
            {filteredIssues.map((issue, index) => (
              <PowerCapacityIssueCard
                key={`${issue.connection.id}-${index}`}
                issue={issue}
                onRecommendSolution={onRecommendSolution}
                enableDetailedAnalysis={enableDetailedAnalysis}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Critical power shortages:{' '}
              {issues.filter((i) => i.severity === 'critical').length} • Total
              power deficit: {totalShortfall}mA
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

interface PowerCapacityIssueCardProps {
  issue: PowerCapacityIssue;
  onRecommendSolution?: (connectionId: string, recommendation: string) => void;
  enableDetailedAnalysis: boolean;
}

const PowerCapacityIssueCard: React.FC<PowerCapacityIssueCardProps> = ({
  issue,
  onRecommendSolution,
  // enableDetailedAnalysis
}) => {
  const {
    powerInfo,
    connection,
    fromComponent,
    toComponent,
    voltageIssue,
    severity,
  } = issue;

  return (
    <div
      className={`border rounded-lg p-4 ${
        severity === 'critical'
          ? 'border-red-200 bg-red-50'
          : 'border-orange-200 bg-orange-50'
      }`}
    >
      {/* Issue Overview */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">{getPowerIssueIcon({ issue })}</div>

        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-2">
            {fromComponent.data?.title} → {toComponent.data?.title}
          </h4>

          {/* Power Analysis */}
          <div className="bg-white rounded-md p-3 mb-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900 mb-1">
                  Power Supply:
                </div>
                <div className="text-gray-700 flex items-center gap-1">
                  <Battery className="h-4 w-4 text-green-600" />
                  {powerInfo.supplierCapacity}mA capacity
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-1">
                  Power Demand:
                </div>
                <div className="text-gray-700 flex items-center gap-1">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  {powerInfo.consumerRequirement}mA required
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-red-700">
                    Power Shortage:
                  </span>
                  <span className="ml-2 text-red-600 font-bold">
                    -{powerInfo.shortfall}mA
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Safety margin: 80% rule applied
                </div>
              </div>
            </div>
          </div>

          {/* Voltage Issue */}
          {voltageIssue && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
              <div className="text-sm">
                <div className="font-medium text-yellow-800 mb-1">
                  Voltage Level Issue:
                </div>
                <div className="text-yellow-700">
                  {voltageIssue.fromVoltage}V → {voltageIssue.toVoltage}V
                  {voltageIssue.requiresRegulator && (
                    <span className="ml-2 text-yellow-600">
                      (Regulator required)
                    </span>
                  )}
                </div>
                {voltageIssue.recommendedIC && (
                  <div className="text-xs text-yellow-600 mt-1">
                    Recommended IC: {voltageIssue.recommendedIC}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {powerInfo.recommendation && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
              <div className="text-sm">
                <div className="font-medium text-blue-900 mb-1">
                  Recommendations:
                </div>
                <div className="text-blue-800">{powerInfo.recommendation}</div>
              </div>
            </div>
          )}

          {/* Solution Button */}
          {onRecommendSolution && powerInfo.recommendation && (
            <div className="mt-3">
              <button
                onClick={() =>
                  onRecommendSolution(connection.id, powerInfo.recommendation!)
                }
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Apply Recommendation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Functions

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

function analyzeVoltageCompatibility(
  fromComponent: Node<NodeData>,
  toComponent: Node<NodeData>,
): PowerCapacityIssue['voltageIssue'] {
  const fromVoltage = extractVoltageLevel(fromComponent);
  const toVoltage = extractVoltageLevel(toComponent);

  if (Math.abs(fromVoltage - toVoltage) <= 0.5) {
    return undefined; // Compatible voltages
  }

  const requiresRegulator =
    fromVoltage > toVoltage && fromVoltage - toVoltage > 1.0;
  let recommendedIC: string | undefined;

  if (requiresRegulator) {
    if (fromVoltage === 5.0 && toVoltage === 3.3) {
      recommendedIC = 'AMS1117-3.3 (Linear Regulator)';
    } else if (fromVoltage > 6.0) {
      recommendedIC = 'LM2596 (Switching Regulator)';
    } else {
      recommendedIC = 'AMS1117 Series (Linear Regulator)';
    }
  }

  return {
    fromVoltage,
    toVoltage,
    requiresRegulator,
    recommendedIC,
  };
}

function extractVoltageLevel(component: Node<NodeData>): number {
  const voltage = component.data?.voltage || '3.3V';
  const match = voltage.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 3.3;
}

function getPowerIssueIcon({ issue }: { issue: PowerCapacityIssue }) {
  if (issue.severity === 'critical') {
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  } else {
    return <AlertTriangle className="h-5 w-5 text-orange-600" />;
  }
}

export default PowerCapacityWarning;
