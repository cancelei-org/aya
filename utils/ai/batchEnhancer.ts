// Batch processing for AI part specification searches
import { AISpecificationService } from './core/aiSpecificationService';
import type { PartSpecification } from '../types/hardwareAnalysis';
import type { ComponentSearchResult } from './core/aiSpecificationService';

// Fixed batch size for optimal performance and reliability
const BATCH_SIZE = 5;

// Maximum number of parallel batches to prevent API rate limits
const MAX_PARALLEL_BATCHES = 3;

// Initialize AI service
const aiService = AISpecificationService.getInstance();

/**
 * Batch specification result with part identification
 */
interface BatchSpecificationResult {
  partName: string;
  modelNumber?: string;
  specification: Record<string, unknown> | null;
  error?: string;
}

/**
 * Process parts in batches of 5 for efficient AI API usage
 * Now with parallel batch processing for improved performance
 * Returns a map of partName -> specification for easy lookup
 */
export async function batchSearchSpecifications(
  parts: PartSpecification[],
): Promise<Map<string, ComponentSearchResult | null>> {
  const results = new Map<string, ComponentSearchResult | null>();

  // Create batches
  const batches: PartSpecification[][] = [];
  for (let i = 0; i < parts.length; i += BATCH_SIZE) {
    batches.push(parts.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `[BATCH] Processing ${parts.length} parts in ${batches.length} batches (parallel mode)`,
  );

  // Process batches in parallel with rate limiting
  const processedBatches: BatchSpecificationResult[][] = [];

  // Process in chunks to respect MAX_PARALLEL_BATCHES
  for (let i = 0; i < batches.length; i += MAX_PARALLEL_BATCHES) {
    const parallelBatches = batches.slice(i, i + MAX_PARALLEL_BATCHES);

    console.log(
      `[BATCH] Processing parallel chunk: batches ${i + 1}-${Math.min(i + MAX_PARALLEL_BATCHES, batches.length)} of ${batches.length}`,
    );

    // Process current chunk in parallel
    const batchPromises = parallelBatches.map((batch, batchIndex) =>
      processBatch(batch)
        .then(results => {
          console.log(
            `[BATCH] ✅ Batch ${i + batchIndex + 1} completed with ${results.length} parts`,
          );
          return results;
        })
        .catch(error => {
          console.error(
            `[BATCH] ❌ Batch ${i + batchIndex + 1} failed:`,
            error,
          );
          // Return empty results for failed batch
          return batch.map(part => ({
            partName: part.partName,
            modelNumber: part.modelNumber,
            specification: null,
            error: 'Batch processing failed',
          }));
        })
    );

    // Wait for current chunk to complete
    const chunkResults = await Promise.allSettled(batchPromises);

    // Extract results from settled promises
    chunkResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        processedBatches.push(result.value);
      }
    });
  }

  // Flatten and store all results in map
  let partIndex = 0;
  processedBatches.forEach((batchResults) => {
    batchResults.forEach((result) => {
      const part = parts[partIndex++];
      if (result.specification) {
        results.set(part.partName, {
          specification: result.specification,
          confidence: 0.8, // Default confidence for batch results
          sources: [
            {
              type: 'ai-generated',
              name: 'GPT-5 Batch Analysis',
              reliability: 0.8,
            },
          ],
          alternatives: [],
        });
      } else {
        results.set(part.partName, null);
      }
    });
  });

  const successCount = Array.from(results.values()).filter(
    (r) => r !== null,
  ).length;
  console.log(
    `[BATCH] Successfully retrieved ${successCount}/${parts.length} specifications`,
  );

  return results;
}

/**
 * Process a single batch of parts (up to BATCH_SIZE)
 */
async function processBatch(
  parts: PartSpecification[],
): Promise<BatchSpecificationResult[]> {
  const prompt = createBatchPrompt(parts);

  try {
    // Use the existing AI service for consistency
    const completion = await aiService['openai'].chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: getBatchSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      //// temperature: 0.1,
      max_completion_tokens: 8000, // Increased for better response
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Empty response from AI');
    }

    return parseBatchResponse(response, parts);
  } catch (error) {
    console.error('[BATCH] AI API call failed:', error);
    throw error;
  }
}

/**
 * Create a batch prompt for multiple parts
 */
function createBatchPrompt(parts: PartSpecification[]): string {
  const partsList = parts
    .map((part, index) => {
      const details = [];
      if (part.partName) details.push(part.partName);
      if (part.modelNumber) details.push(`Model: ${part.modelNumber}`);
      if (part.description) details.push(`Description: ${part.description}`);
      if (part.category) details.push(`Category: ${part.category}`);
      return `${index + 1}. ${details.join(', ')}`;
    })
    .join('\n');

  return `Please provide detailed technical specifications for the following ${parts.length} electronic components:

${partsList}

For each component, include:
- Voltage specifications (operating range, typical values)
- Communication protocols and interfaces (MUST include a "communication" object with "protocols" array)
- Pin configurations and I/O capabilities
- Power consumption details
- Physical dimensions and package type
- Key features and capabilities

IMPORTANT: Each component specification MUST include:
- "category": Component category (e.g., "microcontroller", "sensor", "display", "communication", "power", etc.)
- "communication": { "protocols": ["UART", "I2C", "SPI", etc.] } - list ALL supported protocols

Return a JSON object with an array called "results" containing specifications for each component in the exact same order as listed above.`;
}

/**
 * Get the system prompt for batch processing
 */
function getBatchSystemPrompt(): string {
  return `You are an expert electronics engineer providing detailed component specifications.
  
Return accurate technical specifications in a structured JSON format.
Each component should have comprehensive details about electrical characteristics, interfaces, and capabilities.

CRITICAL REQUIREMENTS:
- Each component MUST have a "communication" object with BOTH "protocols" array AND "connectors" array
- For microcontrollers (ESP32, Arduino, STM32, etc): 
  - protocols MUST include ["UART", "I2C", "SPI", "GPIO", "PWM"]
  - connectors should include [{"type": "USB", "count": 1, "version": "2.0"}]
- For displays (OLED, LCD, monitors, screens): 
  - protocols should include ["I2C"] or ["SPI"] or both
  - connectors MUST include [{"type": "HDMI", "count": 1}] or [{"type": "DisplayPort", "count": 1}]
- For sensors: protocols typically include ["I2C", "Analog"] or ["SPI", "Analog"]
- For cameras: connectors should include [{"type": "USB", "count": 1}] or [{"type": "MIPI CSI", "count": 1}]
- Always specify the category: "microcontroller", "sensor", "display", "communication", "power", etc.

Important:
- Maintain the exact order of components as provided
- If a component cannot be identified, still include an entry with null specification
- Use standard units (V for voltage, mA for current, etc.)
- Include ALL communication protocols the component supports`;
}

/**
 * Parse the batch response and map to results
 */
function parseBatchResponse(
  response: string,
  originalParts: PartSpecification[],
): BatchSpecificationResult[] {
  try {
    const parsed = JSON.parse(response);
    const results = parsed.results || [];

    // Ensure we have a result for each part
    return originalParts.map((part, index) => {
      const result = results[index];

      if (result && typeof result === 'object') {
        console.log('[BATCH DEBUG] Raw result from AI for', part.partName, ':', result);
        // Pass original part name to normalizeSpecification
        const normalized = normalizeSpecification(result, part.partName, part.modelNumber);
        console.log('[BATCH DEBUG] Normalized specification for', part.partName, ':', normalized);
        console.log('[BATCH DEBUG] Protocols extracted for', part.partName, ':', normalized.communication?.protocols);
        return {
          partName: part.partName,
          modelNumber: part.modelNumber,
          specification: normalized,
        };
      } else {
        return {
          partName: part.partName,
          modelNumber: part.modelNumber,
          specification: null,
          error: 'No specification found in batch response',
        };
      }
    });
  } catch (error) {
    console.error('[BATCH] Failed to parse response:', error);
    // Return null specifications for all parts
    return originalParts.map((part) => ({
      partName: part.partName,
      modelNumber: part.modelNumber,
      specification: null,
      error: 'Failed to parse batch response',
    }));
  }
}

/**
 * Normalize specification format to match existing system expectations
 */
function normalizeSpecification(
  spec: Record<string, unknown>,
  originalPartName?: string,
  originalModelNumber?: string,
): Record<string, unknown> {
  // Helper to safely access nested properties
  const getNestedValue = (obj: unknown, ...keys: string[]): unknown => {
    let current = obj;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    return current;
  };

  const voltage = getNestedValue(spec, 'voltage') as
    | Record<string, unknown>
    | undefined;
  const communication = getNestedValue(spec, 'communication') as
    | Record<string, unknown>
    | undefined;
  const io = getNestedValue(spec, 'io') as Record<string, unknown> | undefined;
  const power = getNestedValue(spec, 'power') as
    | Record<string, unknown>
    | undefined;
  const physical = getNestedValue(spec, 'physical') as
    | Record<string, unknown>
    | undefined;

  // Normalize category first for use in protocol extraction
  const normalizedCategory = spec.category || 'other';

  // Build normalized spec with category for protocol extraction
  // Use original part name if provided, fallback to spec fields
  const normalizedSpec = {
    name: originalPartName || spec.name || spec.partName || 'Unknown',
    category: normalizedCategory
  };

  // Extract protocols with proper category context
  let protocols = communication?.protocols as string[] | undefined;
  if (!protocols || protocols.length === 0) {
    protocols = spec.protocols as string[] | undefined;
  }
  if (!protocols || protocols.length === 0) {
    // Pass the spec with normalized category for better detection
    protocols = extractProtocolsWithDefaults({ ...spec, category: normalizedCategory });
  }

  // Extract or generate connectors based on category
  let connectors = communication?.connectors as any[] | undefined;
  if (!connectors || connectors.length === 0) {
    connectors = spec.connectors as any[] | undefined;
  }
  if (!connectors || connectors.length === 0) {
    // Generate default connectors based on category
    connectors = generateDefaultConnectors(normalizedCategory, spec.name as string || '');
  }

  console.log('[NORMALIZE DEBUG] Protocol & Connector extraction for', originalPartName || spec.name || spec.partName, ':', {
    fromCommunication: communication?.protocols,
    fromSpec: spec.protocols,
    extracted: protocols,
    connectors: connectors,
    category: normalizedCategory
  });

  // Ensure consistent structure with existing specifications
  return {
    name: normalizedSpec.name,
    modelNumber: originalModelNumber || spec.modelNumber || spec.model || '',
    category: normalizedCategory,

    voltage: {
      operating: Array.isArray(voltage?.operating)
        ? voltage.operating
        : [voltage?.typical || '5V'],
      input: voltage?.input || { min: 3.3, max: 5 },
    },

    communication: {
      protocols: protocols,
      pins: communication?.pins || {},
      connectors: connectors,
    },

    io: {
      digital: io?.digital || spec.digitalPins || 0,
      analog: io?.analog || spec.analogPins || 0,
      pwm: io?.pwm || 0,
    },

    power: {
      consumption: power?.consumption || {
        typical: power?.typical || 100,
        max: power?.max || 200,
      },
    },

    physical: {
      dimensions: physical?.dimensions || {},
      weight: physical?.weight || 0,
      package: physical?.package || spec.package || '',
    },

    features: spec.features || [],
    applications: spec.applications || [],
  };
}

/**
 * Extract communication protocols from various spec formats
 */
function extractProtocols(spec: Record<string, unknown>): string[] {
  const protocols: string[] = [];

  // Check various possible locations for protocol info
  const sources = [
    spec.interfaces,
    spec.communication,
    spec.protocols,
    spec.connectivity,
  ];

  sources.forEach((source) => {
    if (Array.isArray(source)) {
      protocols.push(...source);
    } else if (typeof source === 'string') {
      // Split comma-separated protocols
      protocols.push(...source.split(/[,;]/).map((p) => p.trim()));
    }
  });

  // Also check for specific protocol fields
  const protocolFields = ['i2c', 'spi', 'uart', 'usb', 'wifi', 'bluetooth'];
  protocolFields.forEach((protocol) => {
    if (spec[protocol] === true || spec[protocol.toUpperCase()] === true) {
      protocols.push(protocol.toUpperCase());
    }
  });

  // Remove duplicates and return
  return [...new Set(protocols.filter((p) => p.length > 0))];
}

/**
 * Generate default connectors based on category
 */
function generateDefaultConnectors(category: string, name: string): any[] {
  const cat = category.toLowerCase();
  const n = name.toLowerCase();

  // Display devices
  if (cat.includes('display') || n.includes('display') ||
    n.includes('monitor') || n.includes('screen') ||
    n.includes('oled') || n.includes('lcd')) {
    // Small displays (OLED/LCD) typically don't have HDMI
    if (n.includes('oled') || (n.includes('lcd') && !n.includes('monitor'))) {
      return []; // I2C/SPI displays don't have special connectors
    }
    // Larger displays/monitors
    return [{ type: 'HDMI', count: 1, version: '2.0' }];
  }

  // Microcontrollers
  if (cat.includes('microcontroller') || cat.includes('mcu') ||
    n.includes('esp32') || n.includes('arduino') || n.includes('stm32')) {
    return [{ type: 'USB', count: 1, version: '2.0', purpose: 'Programming/Power' }];
  }

  // Cameras
  if (cat.includes('camera') || n.includes('camera') || n.includes('cam')) {
    if (n.includes('usb')) {
      return [{ type: 'USB', count: 1, version: '2.0' }];
    }
    return [{ type: 'MIPI CSI', count: 1 }];
  }

  // Audio devices
  if (cat.includes('audio') || cat.includes('speaker') ||
    n.includes('speaker') || n.includes('amplifier')) {
    return [{ type: '3.5mm Jack', count: 1, purpose: 'Audio Output' }];
  }

  // Network devices
  if (cat.includes('network') || cat.includes('ethernet') ||
    n.includes('ethernet') || n.includes('lan')) {
    return [{ type: 'RJ45', count: 1, purpose: 'Ethernet' }];
  }

  // Power supplies
  if (cat.includes('power') || n.includes('power supply') || n.includes('adapter')) {
    return [{ type: 'DC Jack', count: 1, purpose: 'Power Input' }];
  }

  return [];
}

/**
 * Extract protocols with category-based defaults
 */
function extractProtocolsWithDefaults(spec: Record<string, unknown>): string[] {
  console.log('[EXTRACT DEBUG] Input spec:', spec);

  // Try existing extraction first
  const extracted = extractProtocols(spec);
  console.log('[EXTRACT DEBUG] Extracted protocols:', extracted);

  // If empty, use category-based defaults
  if (extracted.length === 0) {
    console.log('[EXTRACT DEBUG] No protocols found, using category-based defaults');
    const category = (spec.category as string)?.toLowerCase() || '';
    const name = (spec.name as string)?.toLowerCase() || '';

    // Microcontroller detection
    if (category.includes('microcontroller') || category.includes('mcu') ||
      category.includes('control') ||
      name.includes('esp32') || name.includes('esp8266') ||
      name.includes('arduino') || name.includes('stm32') ||
      name.includes('atmega') || name.includes('raspberry')) {
      console.log('[EXTRACT DEBUG] Detected microcontroller, returning default protocols');
      return ['UART', 'I2C', 'SPI', 'GPIO', 'PWM'];
    }

    // Display detection
    if (category.includes('display') ||
      name.includes('oled') || name.includes('lcd') ||
      name.includes('screen') || name.includes('display')) {
      return ['I2C', 'SPI'];
    }

    // Sensor detection
    if (category.includes('sensor') ||
      name.includes('sensor') || name.includes('detector')) {
      return ['I2C', 'Analog'];
    }

    // Communication module detection
    if (category.includes('communication') || category.includes('wireless') ||
      name.includes('wifi') || name.includes('bluetooth') ||
      name.includes('zigbee') || name.includes('lora')) {
      return ['UART', 'SPI'];
    }

    // Input device detection (buttons, switches)
    if (category.includes('input') || category.includes('switch') ||
      name.includes('button') || name.includes('switch') ||
      name.includes('keypad')) {
      return ['GPIO', 'Analog'];
    }

    // Output device detection (LEDs, buzzers, motors)
    if (category.includes('output') || category.includes('actuator') ||
      name.includes('led') || name.includes('buzzer') ||
      name.includes('motor') || name.includes('relay')) {
      return ['GPIO', 'PWM'];
    }

    // Power/USB modules
    if (category.includes('power') || category.includes('usb') ||
      name.includes('usb') || name.includes('power')) {
      return ['USB'];
    }
  }

  return extracted;
}
