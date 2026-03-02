'use client';

import React, { memo } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  BaseEdge,
  getSmoothStepPath,
  getSimpleBezierPath,
} from '@xyflow/react';
import { Badge } from '@/components/ui/badge';

interface SmartEdgeData {
  fromPort?: string;
  toPort?: string;
  isCompatible?: boolean;
  protocol?: string;
  voltage?: string;
}

export const SmartEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    markerEnd,
    selected = false,
  }: EdgeProps<SmartEdgeData>) => {
    const [isHovered, setIsHovered] = React.useState(false);

    // Calculate smart path based on node positions
    const getSmartPath = () => {
      const dx = Math.abs(targetX - sourceX);
      const dy = Math.abs(targetY - sourceY);

      // Use different path algorithms based on distance and direction
      if (dx > 200 || dy > 200) {
        // For long distances, use smooth step for cleaner routing
        return getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          borderRadius: 8,
          offset: 32,
        });
      } else {
        // For short distances, use simple bezier
        return getSimpleBezierPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
        });
      }
    };

    const [edgePath, labelX, labelY] = getSmartPath();

    // Extract port labels from IDs
    const getPortLabel = (portId?: string) => {
      if (!portId) return '';

      // Map dynamic port IDs to readable labels
      const portMappings: Record<string, string> = {
        power_in_3_3: '3.3V',
        power_in_5: '5V',
        gnd_0: 'GND',
        gnd_1: 'GND',
        vin: 'Vin',
        i2c_sda: 'SDA',
        i2c_scl: 'SCL',
        spi_miso: 'MISO',
        spi_mosi: 'MOSI',
        spi_sck: 'SCK',
        spi_cs: 'CS',
        uart_tx: 'TX',
        uart_rx: 'RX',
        digital_pwm: 'PWM',
        digital_standard: 'Digital',
        digital_io: 'Digital I/O',
        analog_input: 'Analog In',
        analog_out: 'Analog Out',
        connector_usb_0: 'USB',
        'output-center': 'Output',
        'input-center': 'Input',
      };

      return portMappings[portId] || portId;
    };

    // Determine edge color based on port type and existing color scheme
    const getEdgeColor = () => {
      if (data?.isCompatible === false) {
        return '#ef4444'; // Red for incompatible
      }

      // Determine color based on port type
      if (data?.fromPort || data?.toPort) {
        const portId = data.fromPort || data.toPort || '';

        // Power ports - Red
        if (
          portId.includes('power') ||
          portId.includes('gnd') ||
          portId.includes('vin')
        ) {
          return '#ef4444';
        }

        // Communication ports - Blue
        if (
          portId.includes('i2c') ||
          portId.includes('spi') ||
          portId.includes('uart') ||
          portId.includes('serial') ||
          portId.includes('comm')
        ) {
          return '#3b82f6';
        }

        // Analog ports - Yellow/Amber
        if (portId.includes('analog')) {
          return '#f59e0b';
        }

        // Digital ports - Green
        if (portId.includes('digital') || portId.includes('gpio')) {
          return '#10b981';
        }

        // Connector ports - Purple
        if (portId.includes('connector')) {
          return '#8b5cf6';
        }
      }

      return '#6b7280'; // Default gray
    };

    const edgeColor = getEdgeColor();

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            stroke: edgeColor,
            strokeWidth: selected || isHovered ? 3 : 2,
            opacity: selected || isHovered ? 1 : 0.8,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />

        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="flex flex-col items-center gap-1"
          >
            {/* Show port connection info when hovered or selected */}
            {(isHovered || selected) && (data?.fromPort || data?.toPort) && (
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 border border-gray-200">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {getPortLabel(data.fromPort)}
                  </Badge>
                  <span className="text-gray-400">→</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {getPortLabel(data.toPort)}
                  </Badge>
                </div>

                {/* Compatibility warning */}
                {data?.isCompatible === false && (
                  <div className="mt-1 text-xs text-red-600 font-medium text-center">
                    ⚠️ Incompatible connection
                  </div>
                )}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  },
);

SmartEdge.displayName = 'SmartEdge';
