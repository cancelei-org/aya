// Server-side part enhancement utility for generate-system API
import { prisma } from '@/lib/prisma';
import { AISpecificationService } from './core/aiSpecificationService';
import { DynamicPortSystem } from '../connections/ports/dynamicPortSystem';
import { getIntegratedPricingCache } from '../pricing/integratedPricingCache';
import { batchSearchSpecifications } from './batchEnhancer';
import type { PartSpecification } from '../types/hardwareAnalysis';
import type { DynamicPortConfig } from '@/types/canvas';
import type { ComponentPricingExtended, ShippingDestination } from '@/types';

// Server-side only - no client-side imports
const aiService = AISpecificationService.getInstance();
const dynamicPortSystem = new DynamicPortSystem();

interface ServerEnhancedPart extends PartSpecification {
  specifications?: Record<string, unknown>;
  dynamicPorts?: DynamicPortConfig;
  ports?: Array<{
    id: string;
    label: string;
    type: string;
    protocol?: string;
    direction: 'input' | 'output' | 'bidirectional';
    position?: {
      side: 'top' | 'right' | 'bottom' | 'left';
      index: number;
    };
  }>;
  detailsFetched?: boolean;
  price?: string;
  aiPricing?: ComponentPricingExtended;
  datasheetUrl?: string; // 仕様書URL
  isPreset?: boolean; // 事前登録品フラグ
  presetSource?: string; // 事前登録元（database/cache）
}

/**
 * Enhance parts with detailed specifications on the server side
 * This runs in the API endpoint, not in the browser
 */
export async function enhancePartsOnServer(
  parts: PartSpecification[],
  shippingDestination?: ShippingDestination,
): Promise<ServerEnhancedPart[]> {
  console.log(`[SERVER] Enhancing ${parts.length} parts with details...`);

  // Use batch processing for 5 or more parts (can be disabled via environment variable)
  const useBatchProcessing = process.env.USE_BATCH_ENHANCEMENT !== 'false';
  // Allow disabling price fetching for development
  const fetchPricing = process.env.DISABLE_PRICE_FETCHING !== 'true';

  if (useBatchProcessing && parts.length >= 5) {
    try {
      console.log(`[SERVER] Using batch processing for ${parts.length} parts`);

      // Get specifications in batches
      const batchSpecifications = await batchSearchSpecifications(parts);

      // Process each part with its specification
      const enhancementPromises = parts.map(async (part, index) => {
        const nodeId = `system-part-${index}`;
        const batchedSpec = batchSpecifications.get(part.partName);

        if (batchedSpec && batchedSpec.specification) {
          // Process with batched specification
          return processWithSpecification(
            part,
            batchedSpec,
            nodeId,
            shippingDestination,
            fetchPricing,
          );
        } else {
          // Fallback to basic info if not found in batch
          console.log(
            `[SERVER] No batch spec for ${part.partName}, using basic info`,
          );
          return enhanceWithBasicInfo(
            part,
            nodeId,
            shippingDestination,
            fetchPricing,
          );
        }
      });

      const results = await Promise.all(enhancementPromises);
      const successCount = results.filter((r) => r.detailsFetched).length;
      console.log(
        `[SERVER] ✅ Enhanced ${successCount}/${parts.length} parts with batch processing`,
      );

      return results;
    } catch (error) {
      console.error(
        '[SERVER] Batch processing failed, falling back to individual processing:',
        error,
      );
      // Fall through to individual processing
    }
  }

  // Individual processing for small batches or as fallback
  console.log(`[SERVER] Using individual processing for ${parts.length} parts`);

  const enhancementPromises = parts.map(async (part, index) => {
    const nodeId = `system-part-${index}`;

    try {
      // First, check if this is a preset component
      console.log(`[SERVER] Checking preset for: ${part.partName}`);
      const presetComponent = await prisma.componentSpecification.findFirst({
        where: {
          OR: [
            { partName: { equals: part.partName, mode: 'insensitive' } },
            {
              modelNumber: {
                equals: part.modelNumber || '',
                mode: 'insensitive',
              },
            },
          ],
          isPreset: true,
        },
      });

      if (presetComponent) {
        console.log(
          `[SERVER] ✅ Using preset specification for ${part.partName}`,
        );

        // Use preset specification
        const aiSearchResult = {
          specification: presetComponent.specification as Record<
            string,
            unknown
          >,
          confidence: presetComponent.confidence,
        };

        // Process with preset specification (still fetch pricing dynamically)
        const result = await processWithSpecification(
          part,
          aiSearchResult,
          nodeId,
          shippingDestination,
          fetchPricing,
        );

        // Mark as preset component
        return {
          ...result,
          isPreset: true,
          presetSource: 'database',
        };
      }

      // Not a preset component, use AI search
      console.log(`[SERVER] Searching AI specifications for: ${part.partName}`);
      const aiSearchResult = await aiService.searchComponentSpecification({
        componentName: part.partName,
        searchDepth: 'detailed',
        includeAlternatives: false,
        focusAreas: ['communication', 'power', 'pinout'],
      });

      if (aiSearchResult && aiSearchResult.specification) {
        return processWithSpecification(
          part,
          aiSearchResult,
          nodeId,
          shippingDestination,
          fetchPricing,
        );
      } else {
        console.log(
          `[SERVER] ⚠️ No specifications found for ${part.partName}, using basic info`,
        );
        return enhanceWithBasicInfo(
          part,
          nodeId,
          shippingDestination,
          fetchPricing,
        );
      }
    } catch (error) {
      console.error(`[SERVER] ❌ Error enhancing ${part.partName}:`, error);
      // Fallback to basic enhancement on error
      return enhanceWithBasicInfo(
        part,
        nodeId,
        shippingDestination,
        fetchPricing,
      );
    }
  });

  const results = await Promise.all(enhancementPromises);

  const successCount = results.filter((r) => r.detailsFetched).length;
  console.log(
    `[SERVER] ✅ Enhanced ${successCount}/${parts.length} parts with detailed specs`,
  );

  return results;
}

/**
 * Process a part with its specification (shared by batch and individual processing)
 */
async function processWithSpecification(
  part: PartSpecification,
  aiSearchResult: {
    specification: Record<string, unknown>;
    confidence?: number;
  },
  nodeId: string,
  shippingDestination?: ShippingDestination,
  fetchPricing: boolean = true,
): Promise<ServerEnhancedPart> {
  console.log(`[SERVER] ✅ Found specifications for ${part.partName}`);

  // Extract datasheet URL from specification sources
  const aiSpec = aiSearchResult.specification as Record<string, unknown>;
  const datasheetUrl =
    aiSpec?.datasheetUrl || // Direct datasheet URL field
    aiSpec?.reliability?.sources?.[0]?.url ||
    aiSpec?.sources?.[0]?.url ||
    aiSpec?.purchaseUrls?.[0]?.url; // Fallback to purchase URL

  if (datasheetUrl) {
    console.log(
      `[SERVER] 📄 Found datasheet URL for ${part.partName}: ${datasheetUrl}`,
    );
  } else {
    console.log(`[SERVER] ⚠️ No datasheet URL found for ${part.partName}`);
    console.log(
      `[SERVER] Available fields in spec:`,
      Object.keys(aiSpec || {}),
    );
  }

  // Ports will be generated after dynamicPorts is created

  // 価格データ取得を並列で準備（実際の取得は後で並列実行）
  const fetchPricingData = async () => {
    if (!fetchPricing) {
      console.log(
        `[SERVER] Price fetching disabled (DISABLE_PRICE_FETCHING=true)`,
      );
      return { pricing: [], lowestPrice: null };
    }

    try {
      // デフォルトの配送先（shippingDestinationが指定されていない場合）
      const defaultDestination: ShippingDestination = shippingDestination || {
        country: 'Japan',
        city: 'Tokyo',
        postalCode: '100-0001',
      };

      const cache = getIntegratedPricingCache();
      const pricing = await cache.getPricing(
        nodeId,
        part.modelNumber || part.partName,
        defaultDestination,
      );
      let lowestPrice = pricing.length > 0 ? pricing[0] : null;

      // 最安値の価格情報を保持しつつ、有効なURLを探す
      if (lowestPrice && !lowestPrice.purchaseUrl) {
        // 有効なURLを持つサプライヤーを探す
        const supplierWithUrl = pricing.find((p) => p.purchaseUrl);
        if (supplierWithUrl) {
          // 最安値の価格情報は保持し、URLだけ有効なものに置き換える
          lowestPrice = {
            ...lowestPrice,
            purchaseUrl: supplierWithUrl.purchaseUrl,
            alternativeSupplier: supplierWithUrl.supplier, // どのサプライヤーのURLかを記録
          };
        }
      }

      console.log(
        `[SERVER] 💰 Price data fetched for ${part.partName}: ${lowestPrice?.unitPrice || 'N/A'}`,
      );
      const urlStatus = lowestPrice?.purchaseUrl
        ? '✅ Valid'
        : '❌ Invalid/Missing';
      console.log(
        `[SERVER] 🔗 Purchase URL: ${urlStatus} - ${lowestPrice?.purchaseUrl || 'NO URL'}`,
      );

      return { pricing, lowestPrice };
    } catch (error) {
      console.warn(
        `[SERVER] ⚠️ Failed to fetch pricing for ${part.partName}:`,
        error,
      );
      return { pricing: [], lowestPrice: null };
    }
  };

  // ポート生成と価格取得を並列実行
  const [dynamicPorts, pricingData] = await Promise.all([
    // ポート生成
    Promise.resolve(
      dynamicPortSystem.generatePortsFromSpecification(
        nodeId,
        aiSearchResult.specification,
      ),
    ),
    // 価格取得
    fetchPricingData(),
  ]);

  const { pricing, lowestPrice } = pricingData;

  // Generate ports array from dynamicPorts for UI compatibility
  const ports = dynamicPorts.portGroups.flatMap((group) =>
    group.ports.map((port) => ({
      id: port.id,
      label: port.label,
      type: port.type,
      protocol: port.protocol,
      direction: port.direction,
      position: port.position,
    })),
  );

  // Log port generation results with detailed info
  console.log(`[SERVER] Generated ports for ${part.partName}:`, {
    portGroups: dynamicPorts.portGroups.length,
    totalPorts: ports.length,
    samplePort: ports[0] || null,
    dynamicPortsStructure: {
      hasPortGroups: !!dynamicPorts.portGroups,
      portGroupsLength: dynamicPorts.portGroups.length,
      firstGroupPorts: dynamicPorts.portGroups[0]?.ports?.length || 0,
    },
  });

  const voltage = aiSpec.voltage as { operating?: string[] } | undefined;
  const communication = aiSpec.communication as
    | { protocols?: string[] }
    | undefined;
  const io = aiSpec.io as { digital?: number; analog?: number } | undefined;

  return {
    ...part,
    specifications: aiSearchResult.specification,
    dynamicPorts: dynamicPorts,
    ports: ports, // Add the flattened ports array
    detailsFetched: true,
    // Update with more accurate data from specification
    voltage: voltage?.operating?.join(', ') || part.voltage,
    communication: communication?.protocols?.join(', ') || part.communication,
    // Update port counts from specification
    inputs: io?.digital || part.inputs,
    outputs: io?.analog || part.outputs,
    // 価格情報を追加（複数のオプションを含む）
    price: lowestPrice?.unitPrice?.toString() || '',
    aiPricing: pricing.length > 1 ? pricing : lowestPrice || undefined,
    datasheetUrl: datasheetUrl, // 仕様書URL
  };
}

/**
 * Enhance part with basic information when detailed specs are not available
 */
async function enhanceWithBasicInfo(
  part: PartSpecification,
  nodeId: string,
  shippingDestination?: ShippingDestination,
  fetchPricing: boolean = true,
): Promise<ServerEnhancedPart> {
  try {
    // Create a basic specification from available information
    const basicSpec = createBasicSpecification(part);

    // Generate dynamic ports from the basic specification
    const dynamicPorts = dynamicPortSystem.generatePortsFromSpecification(
      nodeId,
      basicSpec,
    );

    // Generate ports array from dynamicPorts for UI compatibility
    const ports = dynamicPorts.portGroups.flatMap((group) =>
      group.ports.map((port) => ({
        id: port.id,
        label: port.label,
        type: port.type,
        protocol: port.protocol,
        direction: port.direction,
        position: port.position,
      })),
    );

    console.log(`[SERVER] Generated basic ports for ${part.partName}:`, {
      portGroups: dynamicPorts.portGroups.length,
      totalPorts: ports.length,
    });

    // フォールバック時も価格データを取得
    let pricing: ComponentPricingExtended[] = [];
    let lowestPrice: ComponentPricingExtended | null = null;

    if (fetchPricing) {
      try {
        const defaultDestination: ShippingDestination = shippingDestination || {
          country: 'Japan',
          city: 'Tokyo',
          postalCode: '100-0001',
        };
        const cache2 = getIntegratedPricingCache();
        pricing = await cache2.getPricing(
          nodeId,
          part.modelNumber || part.partName,
          defaultDestination,
        );
        lowestPrice = pricing.length > 0 ? pricing[0] : null;

        // 最安値の価格情報を保持しつつ、有効なURLを探す
        if (lowestPrice && !lowestPrice.purchaseUrl) {
          // 有効なURLを持つサプライヤーを探す
          const supplierWithUrl = pricing.find((p) => p.purchaseUrl);
          if (supplierWithUrl) {
            // 最安値の価格情報は保持し、URLだけ有効なものに置き換える
            lowestPrice = {
              ...lowestPrice,
              purchaseUrl: supplierWithUrl.purchaseUrl,
              alternativeSupplier: supplierWithUrl.supplier, // どのサプライヤーのURLかを記録
            };
          }
        }

        console.log(
          `[SERVER] 💰 Price data fetched (basic) for ${part.partName}: ${lowestPrice?.unitPrice || 'N/A'}`,
        );
      } catch (error) {
        console.warn(
          `[SERVER] ⚠️ Failed to fetch pricing (basic) for ${part.partName}:`,
          error,
        );
      }
    }

    return {
      ...part,
      specifications: basicSpec,
      dynamicPorts: dynamicPorts,
      ports: ports, // Add the flattened ports array
      detailsFetched: false,
      // 価格情報を追加（複数のオプションを含む）
      price: lowestPrice?.unitPrice?.toString() || '',
      aiPricing: pricing.length > 1 ? pricing : lowestPrice || undefined,
    };
  } catch (error) {
    console.error(
      `[SERVER] ❌ Error generating basic ports for ${part.partName}:`,
      error,
    );
    // Return part without enhancements as last resort
    return {
      ...part,
      detailsFetched: false,
    };
  }
}

/**
 * Create a basic specification object from part information
 */
function createBasicSpecification(
  part: PartSpecification,
): Record<string, unknown> {
  const protocols = extractProtocols(part.communication || '');
  const voltage = extractVoltage(part.voltage || '');

  return {
    name: part.partName,
    modelNumber: part.modelNumber,
    category: mapToSpecificationCategory(part.category),
    voltage: {
      operating: voltage ? [voltage] : ['5V'],
      input: { min: 5, max: 12 }, // Default assumption
    },
    communication: {
      protocols: protocols.length > 0 ? protocols : ['GPIO'],
      pins: {
        total: (part.inputs || 1) + (part.outputs || 1),
        digital: part.outputs || 1,
        analog: part.inputs || 1,
      },
    },
    power: {
      consumption: {
        typical: 100,
        max: 200,
      },
    },
    io: {
      digital: part.outputs || 1,
      analog: part.inputs || 1,
      pwm: protocols.includes('PWM') ? 2 : 0,
    },
    physical: {
      dimensions: { length: 50, width: 50, height: 20 }, // Default size
      weight: 50, // Default weight in grams
    },
  };
}

/**
 * Extract communication protocols from a string
 */
function extractProtocols(communication: string): string[] {
  const protocols: string[] = [];
  const commLower = communication.toLowerCase();

  const protocolMap = {
    i2c: 'I2C',
    spi: 'SPI',
    uart: 'UART',
    serial: 'UART',
    usb: 'USB',
    pwm: 'PWM',
    gpio: 'GPIO',
    can: 'CAN',
    ethernet: 'Ethernet',
    wifi: 'WiFi',
    bluetooth: 'Bluetooth',
    rs485: 'RS485',
    rs232: 'RS232',
  };

  for (const [key, value] of Object.entries(protocolMap)) {
    if (commLower.includes(key)) {
      protocols.push(value);
    }
  }

  return protocols;
}

/**
 * Extract voltage value from a string
 */
function extractVoltage(voltageStr: string): string {
  const match = voltageStr.match(/(\d+\.?\d*)\s*V/i);
  return match ? `${match[1]}V` : voltageStr;
}

/**
 * Map part category to specification category
 */
function mapToSpecificationCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    control: 'microcontroller',
    sensor: 'sensor',
    actuator: 'actuator',
    power: 'power-supply',
    communication: 'communication-module',
    mechanical: 'mechanical',
    display: 'display',
    storage: 'storage',
  };

  return categoryMap[category.toLowerCase()] || 'other';
}
