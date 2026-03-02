// Generate system design from requirements document
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { anthropic, MODELS } from '@/lib/anthropic';
import { auth } from '@/lib/auth';
import {
  buildCategoryPrompt,
  buildConnectionTypePrompt,
  formatVoltage,
} from '@/utils/ai/hardwareAnalysisCommon';
import { enhancePartsOnServer } from '@/utils/ai/serverPartEnhancer';

// OpenAI client (commented out for Claude migration)
/*
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
*/

// Check if API key exists
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not configured');
}

// Request validation schema
const generateSystemSchema = z.object({
  requirementsContent: z.string().min(1),
  projectId: z.string().min(1),
  shippingDestination: z
    .object({
      country: z.string(),
      city: z.string(),
      postalCode: z.string(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  console.log('📥 System generation API called');

  // Check if Anthropic API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      '[ERROR] ANTHROPIC_API_KEY is not configured in environment variables',
    );
    return NextResponse.json(
      {
        error: 'Anthropic API key not configured',
        message: 'Please set ANTHROPIC_API_KEY in your environment variables',
      },
      { status: 500 },
    );
  }

  try {
    // Check authentication (bypass in development)
    const session = await auth();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    console.log('[DEBUG] Request body:', JSON.stringify(body));

    // Validate request body
    const validationResult = generateSystemSchema.safeParse(body);
    if (!validationResult.success) {
      console.error(
        '[ERROR] Validation failed:',
        validationResult.error.flatten(),
      );
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { requirementsContent, projectId, shippingDestination } =
      validationResult.data;

    console.log('🚀 Generating system from requirements:', {
      projectId,
      contentLength: requirementsContent.length,
      shippingDestination,
    });

    console.log('[DEBUG] Starting 2-stage system generation...');

    // ========================================
    // STAGE 1: Extract parts list from requirements
    // ========================================
    console.log('[DEBUG] Stage 1: Extracting parts list from requirements...');
    console.log(
      '[DEBUG] Requirements content (first 500 chars):',
      requirementsContent.substring(0, 500),
    );

    const stage1SystemPrompt = `You are a hardware system design expert.
Extract and suggest hardware components based on the requirements document.

IMPORTANT RULES:
1. If specific part names are mentioned (Arduino, ESP32, etc.), use them directly
2. If only categories are mentioned (制御系/controller, センサー/sensor), suggest appropriate specific parts
3. If only functions are described, infer necessary components

Component suggestion guidelines:
- "制御系" or "controller" → Suggest: Arduino Uno, ESP32, or Raspberry Pi based on complexity
- "センサー" or "sensor" → Infer from purpose (temperature→DHT22, motion→PIR, distance→HC-SR04)
- "電源" or "power" → Suggest: 5V adapter, battery pack, or power module
- "表示" or "display" → Suggest: LCD1602, OLED, or LED indicators
- "通信" or "communication" → Suggest: Wi-Fi module, Bluetooth, or LoRa based on range needs

Example interpretations:
- "温度監視システム" → Arduino Uno + DHT22 sensor + LCD1602 display
- "IoTデバイス" → ESP32 + relevant sensors + cloud connectivity
- "ロボット制御" → Arduino Mega + motor drivers + servos

Always generate at least 3-5 basic components even for minimal requirements.

Respond with a simple JSON structure:
{
  "parts": [
    {
      "partName": "specific part name or model number",
      "modelNumber": "model number if different from partName",
      "category": "control/sensor/actuator/power/communication/display/storage/mechanical",
      "quantity": 1,
      "purpose": "brief purpose in system"
    }
  ],
  "summary": "one sentence system summary",
  "keyRequirements": ["requirement1", "requirement2", "requirement3"]
}`;

    // Truncate requirements to avoid token limits in stage 1
    const truncatedRequirements =
      requirementsContent.length > 8000
        ? requirementsContent.substring(0, 8000) +
          '\n\n[Document truncated for parts extraction]'
        : requirementsContent;

    const stage1Prompt = `Analyze this requirements document and extract/suggest hardware components:

${truncatedRequirements}

Instructions:
1. Look for sections marked with **3. 主要コンポーネント** or **Main Components** or similar
2. Extract ALL specific hardware mentioned like: ESP32, SSD1306, DS3231, MCP73831, TTP223, etc.
3. For generic categories (制御系, センサー, controller, sensor), suggest specific parts
4. Parse text that contains model numbers in parentheses, e.g., "ESP32（ESP32-WROOM-32）"
5. Even if formatted with markdown (**bold**), extract the component names

The document likely contains components like:
- Controllers (ESP32, Arduino, etc.)
- Displays (OLED, TFT, LCD, etc.)
- Sensors (temperature, touch, etc.)
- Power components (battery, charging IC, etc.)

Ensure you extract ALL mentioned components and output at least 3-5 components.`;

    let partsListResponse: {
      parts: Array<{
        partName: string;
        modelNumber?: string;
        category: string;
        quantity: number;
        purpose: string;
      }>;
      summary: string;
      keyRequirements: string[];
    };

    try {
      // OpenAI implementation (commented out for Claude migration)
      /*
      const stage1Completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: stage1SystemPrompt
          },
          {
            role: 'user',
            content: stage1Prompt
          }
        ],
        max_completion_tokens: 6000,  // Maximum tokens for complete parts list
        response_format: { type: "json_object" }
      })
      
      // Debug: Log raw AI response
      const rawResponse = stage1Completion.choices[0]?.message?.content || '{}'
      */

      // Claude implementation with Prefill technique
      let stage1Completion;
      try {
        stage1Completion = await anthropic.messages.create({
          model: MODELS.OPUS,
          system:
            stage1SystemPrompt +
            '\n\nIMPORTANT: Return your response as a valid JSON object only. No markdown, no explanations.',
          messages: [
            {
              role: 'user',
              content: stage1Prompt + '\n\nProvide the JSON response:',
            },
            {
              role: 'assistant',
              content: '{',
            },
          ],
          max_tokens: 4096,
        });
      } catch (opusError: any) {
        // If Opus is overloaded (529), try with Sonnet
        if (opusError?.status === 529) {
          console.log('[WARN] Opus overloaded, falling back to Sonnet');
          stage1Completion = await anthropic.messages.create({
            model: MODELS.SONNET,
            system:
              stage1SystemPrompt +
              '\n\nIMPORTANT: Return your response as a valid JSON object only. No markdown, no explanations.',
            messages: [
              {
                role: 'user',
                content: stage1Prompt + '\n\nProvide the JSON response:',
              },
              {
                role: 'assistant',
                content: '{',
              },
            ],
            max_tokens: 4096,
          });
        } else {
          throw opusError;
        }
      }

      // Debug: Log raw AI response
      let rawResponse =
        stage1Completion.content[0]?.type === 'text'
          ? stage1Completion.content[0].text
          : '[]';
      console.log('[DEBUG] Stage 1 raw AI response:', rawResponse);
      console.log(
        '[DEBUG] Stage 1 finish reason:',
        stage1Completion.stop_reason,
      );

      // Clean any accidental markdown first
      if (rawResponse.includes('```')) {
        rawResponse = rawResponse
          .replace(/```(?:json)?\s*/g, '')
          .replace(/```/g, '')
          .trim();
      }

      // Check if response already contains complete JSON
      rawResponse = rawResponse.trim();

      // Remove any trailing characters after the JSON
      const jsonEndIndex = rawResponse.lastIndexOf('}');
      if (jsonEndIndex !== -1 && jsonEndIndex < rawResponse.length - 1) {
        console.log('[WARN] Trimming extra characters after JSON');
        rawResponse = rawResponse.substring(0, jsonEndIndex + 1);
      }

      if (rawResponse.startsWith('{')) {
        // Complete JSON object returned - use as is
        partsListResponse = JSON.parse(rawResponse);
      } else if (rawResponse.startsWith('[')) {
        // Array response - wrap in object with required properties
        partsListResponse = {
          parts: JSON.parse(rawResponse),
          summary: 'Hardware system design based on requirements',
          keyRequirements: [],
        };
      } else {
        // Partial response - add the prefilled start
        rawResponse = '{' + rawResponse;
        partsListResponse = JSON.parse(rawResponse);
      }
      // Validate parts structure
      if (!partsListResponse.parts || !Array.isArray(partsListResponse.parts)) {
        console.error('[ERROR] Invalid parts structure:', partsListResponse);
        throw new Error('Invalid parts list structure - parts is not an array');
      }

      console.log(
        `[SUCCESS] Stage 1: Extracted ${partsListResponse.parts.length} parts`,
      );
      console.log(
        '[DEBUG] Parts list:',
        JSON.stringify(partsListResponse.parts.map((p) => p.partName)),
      );
      console.log(
        '[DEBUG] Parts categories:',
        partsListResponse.parts.map(
          (p: { partName: string; category: string }) =>
            `${p.partName}: ${p.category}`,
        ),
      );
    } catch (error) {
      console.error('[ERROR] Stage 1 failed:', error);
      console.error('[ERROR] Stage 1 error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fallback to simpler extraction with basic component suggestion
      console.log('[WARN] Attempting fallback parts extraction...');
      try {
        // OpenAI implementation (commented out for Claude migration)
        /*
        const fallbackCompletion = await openai.chat.completions.create({
          model: 'gpt-5-nano',
          messages: [
            {
              role: 'system',
              content: `Extract or suggest hardware components. If no specific parts found, suggest basic components based on the system type.
              
              Default suggestions by keyword:
              - Contains "温度/temperature" → Arduino Uno + DHT22 + LCD1602
              - Contains "IoT/遠隔/remote" → ESP32 + sensors + power supply
              - Contains "ロボット/robot/motor" → Arduino Mega + motor driver + servos
              - Default → Arduino Uno + basic sensor + LED + power supply
              
              Return JSON: {"parts": [{"partName": "...", "category": "...", "quantity": 1}], "summary": "system summary"}`
            },
            {
              role: 'user',
              content: truncatedRequirements.substring(0, 4000)
            }
          ],
          max_completion_tokens: 1000,
          response_format: { type: "json_object" }
        })
        partsListResponse = JSON.parse(fallbackCompletion.choices[0]?.message?.content || '{}')
        */

        // Claude implementation with Prefill technique
        const fallbackSystemPrompt = `Extract or suggest hardware components. If no specific parts found, suggest basic components based on the system type.
              
              Default suggestions by keyword:
              - Contains "温度/temperature" → Arduino Uno + DHT22 + LCD1602
              - Contains "IoT/遠隔/remote" → ESP32 + sensors + power supply
              - Contains "ロボット/robot/motor" → Arduino Mega + motor driver + servos
              - Default → Arduino Uno + basic sensor + LED + power supply
              
              Return only valid JSON. No markdown or explanations.`;

        const fallbackCompletion = await anthropic.messages.create({
          model: MODELS.SONNET, // Use Sonnet for fallback to save costs
          system: fallbackSystemPrompt,
          messages: [
            {
              role: 'user',
              content:
                truncatedRequirements.substring(0, 4000) +
                '\n\nProvide the JSON response:',
            },
            {
              role: 'assistant',
              content: '{',
            },
          ],
          max_tokens: 1000,
        });

        let fallbackResponse =
          fallbackCompletion.content[0]?.type === 'text'
            ? fallbackCompletion.content[0].text
            : '[]';

        // Clean any accidental markdown first
        if (fallbackResponse.includes('```')) {
          fallbackResponse = fallbackResponse
            .replace(/```(?:json)?\s*/g, '')
            .replace(/```/g, '')
            .trim();
        }

        // Check if response already contains complete JSON
        fallbackResponse = fallbackResponse.trim();

        // Remove any trailing characters after the JSON
        const jsonEndIndex = fallbackResponse.lastIndexOf('}');
        if (jsonEndIndex !== -1 && jsonEndIndex < fallbackResponse.length - 1) {
          console.log(
            '[WARN] Trimming extra characters after JSON in fallback',
          );
          fallbackResponse = fallbackResponse.substring(0, jsonEndIndex + 1);
        }

        if (fallbackResponse.startsWith('{')) {
          // Complete JSON object returned - use as is
          partsListResponse = JSON.parse(fallbackResponse);
        } else {
          // Partial response - add the prefilled start
          fallbackResponse = '{' + fallbackResponse;
          partsListResponse = JSON.parse(fallbackResponse);
        }
        console.log('[SUCCESS] Fallback extraction completed');
        console.log(
          '[DEBUG] Fallback partsListResponse:',
          JSON.stringify(partsListResponse, null, 2),
        );

        // Handle case where fallback returns 'hardware' instead of 'parts'
        if (!partsListResponse.parts && (partsListResponse as any).hardware) {
          console.log('[WARN] Converting hardware array to parts array format');
          partsListResponse.parts = (partsListResponse as any).hardware.map(
            (hw: {
              type?: string;
              name?: string;
              partName?: string;
              modelNumber?: string;
              quantity?: number;
              purpose?: string;
              specifications?: string;
            }) => {
              // Map hardware types to standard categories
              let category = 'control';
              const type = (hw.type || '').toLowerCase();
              if (
                type.includes('microcontroller') ||
                type.includes('controller')
              ) {
                category = 'control';
              } else if (type.includes('sensor') || type.includes('imu')) {
                category = 'sensor';
              } else if (
                type.includes('servo') ||
                type.includes('motor') ||
                type.includes('actuator')
              ) {
                category = 'actuator';
              } else if (
                type.includes('power') ||
                type.includes('battery') ||
                type.includes('converter')
              ) {
                category = 'power';
              } else if (
                type.includes('communication') ||
                type.includes('wifi') ||
                type.includes('bluetooth')
              ) {
                category = 'communication';
              } else if (
                type.includes('display') ||
                type.includes('lcd') ||
                type.includes('oled')
              ) {
                category = 'display';
              }

              return {
                partName: hw.name || hw.partName,
                modelNumber: hw.modelNumber || hw.name,
                category: category,
                quantity: hw.quantity || 1,
                purpose: hw.purpose || hw.specifications || '',
              };
            },
          );
        }
      } catch (fallbackError) {
        console.error('[ERROR] Fallback also failed:', fallbackError);
        // Last resort: provide minimal default components
        console.log('[WARN] Using default component set as last resort');
        partsListResponse = {
          parts: [
            {
              partName: 'Arduino Uno',
              category: 'control',
              quantity: 1,
              purpose: 'Main controller',
            },
            {
              partName: 'Generic Sensor Module',
              category: 'sensor',
              quantity: 1,
              purpose: 'Input sensing',
            },
            {
              partName: 'LED Indicator',
              category: 'display',
              quantity: 1,
              purpose: 'Status display',
            },
            {
              partName: '5V Power Supply',
              category: 'power',
              quantity: 1,
              purpose: 'System power',
            },
          ],
          summary: 'Basic embedded system',
          keyRequirements: [
            'Basic functionality',
            'Simple interface',
            'Standard components',
          ],
        };
      }
    }

    // Validate parts list
    if (!partsListResponse.parts || partsListResponse.parts.length === 0) {
      console.error('[ERROR] No parts extracted from requirements');
      throw new Error(
        'Could not identify any hardware components in the requirements',
      );
    }

    // ========================================
    // DEDUPLICATION AND GROUPING (for AI processing only)
    // ========================================
    console.log(
      '[DEBUG] Deduplicating and grouping parts for AI processing...',
    );
    console.log(
      '[DEBUG] Original parts count:',
      partsListResponse.parts.length,
    );

    // Keep original parts for UI display
    const originalParts = [...partsListResponse.parts];

    // Function to normalize part names for comparison
    const normalizeName = (name: string): string => {
      if (!name || typeof name !== 'string') {
        return '';
      }
      return name
        .toLowerCase()
        .replace(/\s*devkit\s*/gi, '')
        .replace(/\s*dev\s*kit\s*/gi, '')
        .replace(/\s*development\s*kit\s*/gi, '')
        .replace(/\s*module\s*/gi, '')
        .replace(/\s*board\s*/gi, '')
        .replace(/\s*r\d+/gi, '') // Remove R2, R3, etc.
        .replace(/\s*v\d+\.?\d*/gi, '') // Remove version numbers
        .replace(/[^a-z0-9]/g, '') // Remove special characters
        .trim();
    };

    // Group similar parts for AI processing
    const groupedPartsMap = new Map<
      string,
      {
        partName: string;
        modelNumber?: string;
        category: string;
        quantity: number;
        purpose: string;
        originalName: string;
      }
    >();
    const processedBaseNames = new Map<string, number>(); // Track base names and counts

    partsListResponse.parts.forEach((part) => {
      // Debug: Check part structure
      if (typeof part === 'string') {
        console.error('[ERROR] Part is a string instead of object:', part);
        return;
      }

      // Skip if partName is missing
      if (!part || !part.partName) {
        console.warn('[WARN] Skipping part with missing partName:', part);
        return;
      }

      const normalizedName = normalizeName(part.partName);

      // Extract base name (e.g., "Button A" -> "Button")
      const baseName = part.partName
        .replace(/\s+[A-Z]$/, '')
        .replace(/\s+\d+$/, '')
        .trim();
      const normalizedBaseName = normalizeName(baseName);

      // Check if this is a duplicate of an existing part
      let merged = false;
      for (const [, existingPart] of groupedPartsMap.entries()) {
        const existingNormalized = normalizeName(existingPart.originalName);

        // Exact match after normalization (e.g., ESP32 DevKit -> ESP32)
        if (existingNormalized === normalizedName) {
          existingPart.quantity =
            (existingPart.quantity || 1) + (part.quantity || 1);
          merged = true;
          break;
        }

        // Similar parts with same base (e.g., Button A, Button B)
        if (
          normalizeName(
            existingPart.originalName
              .replace(/\s+[A-Z]$/, '')
              .replace(/\s+\d+$/, ''),
          ) === normalizedBaseName &&
          existingPart.category === part.category
        ) {
          // Update the grouped part
          existingPart.quantity =
            (existingPart.quantity || 1) + (part.quantity || 1);
          existingPart.partName = `${baseName} (x${existingPart.quantity})`;
          merged = true;
          break;
        }
      }

      if (!merged) {
        // Add as new part
        const dedupedPart = {
          ...part,
          originalName: part.partName, // Keep original name
          partName: part.partName, // Will be updated if grouped
        };

        // Check if this is part of a series (Button A, Button B, etc.)
        if (processedBaseNames.has(normalizedBaseName)) {
          // Find the base part and update it
          for (const [, existingPart] of groupedPartsMap.entries()) {
            if (
              normalizeName(
                existingPart.originalName
                  .replace(/\s+[A-Z]$/, '')
                  .replace(/\s+\d+$/, ''),
              ) === normalizedBaseName &&
              existingPart.category === part.category
            ) {
              existingPart.quantity =
                (existingPart.quantity || 1) + (part.quantity || 1);
              existingPart.partName = `${baseName} (x${existingPart.quantity})`;
              merged = true;
              break;
            }
          }
        }

        if (!merged) {
          groupedPartsMap.set(part.partName, dedupedPart);
          processedBaseNames.set(normalizedBaseName, 1);
        }
      }
    });

    // Convert to array for AI processing
    const dedupedPartsForAI = Array.from(groupedPartsMap.values());

    console.log(
      '[DEBUG] After deduplication:',
      dedupedPartsForAI.length,
      'parts for AI',
    );
    console.log(
      '[DEBUG] Deduplicated parts:',
      dedupedPartsForAI.map((p) => `${p.partName} qty:${p.quantity || 1}`),
    );

    // Use deduplicated parts for AI processing in Stage 2
    // But keep original parts for final output
    const partsForAIProcessing = dedupedPartsForAI;

    // ========================================
    // STAGE 2: Generate detailed system design (Split into 3 sub-stages)
    // ========================================
    console.log(
      '[DEBUG] Stage 2: Generating detailed system design (3-stage split)...',
    );

    // Prepare parts with initial specifications for stage 2
    // Use deduplicated parts for AI processing
    const partsWithSpecs = partsForAIProcessing.map((part) => ({
      partName: part.partName,
      modelNumber: part.modelNumber || part.partName,
      category: part.category,
      quantity: part.quantity || 1,
      purpose: part.purpose || '',
      // These will be filled in stage 2
      voltage: '',
      communication: '',
      inputs: 0,
      outputs: 0,
    }));

    // ========================================
    // STAGE 2-1: Generate part specifications only
    // ========================================
    console.log('[DEBUG] Stage 2-1: Generating part specifications...');

    let detailedParts: Array<{
      partName: string;
      modelNumber: string;
      voltage: string;
      communication: string;
      inputs: number;
      outputs: number;
      quantity: number;
      category: string;
      purpose: string;
    }> = [];
    try {
      // OpenAI implementation (commented out for Claude migration)
      /*
      const stage2_1_completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `You are a hardware system design expert.
For each component, specify voltage, communication protocols, and I/O counts.

${buildCategoryPrompt()}

Return JSON format:
{
  "partOrders": [
    {
      "partName": "component name",
      "modelNumber": "model",
      "voltage": "3.3V/5V/12V etc",
      "communication": "I2C/SPI/UART/USB/GPIO etc",
      "inputs": number,
      "outputs": number,
      "quantity": 1,
      "category": "category",
      "purpose": "description"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Generate detailed specifications for these components:
            
${JSON.stringify(partsWithSpecs, null, 2)}

For each part, specify:
- Operating voltage
- Communication methods
- Number of input pins/ports
- Number of output pins/ports`
          }
        ],
        max_completion_tokens: 3000,
        response_format: { type: "json_object" }
      })
      
      const stage2_1_response = JSON.parse(stage2_1_completion.choices[0]?.message?.content || '{}')
      */

      // Claude implementation
      const systemPrompt2_1 = `You are a hardware system design expert.
For each component, specify voltage, communication protocols, and I/O counts.

${buildCategoryPrompt()}

Return JSON format:
{
  "partOrders": [
    {
      "partName": "component name",
      "modelNumber": "model",
      "voltage": "3.3V/5V/12V etc",
      "communication": "I2C/SPI/UART/USB/GPIO etc",
      "inputs": number,
      "outputs": number,
      "quantity": 1,
      "category": "category",
      "purpose": "description"
    }
  ]
}`;

      let stage2_1_completion;
      try {
        stage2_1_completion = await anthropic.messages.create({
          model: MODELS.OPUS,
          system:
            systemPrompt2_1 +
            '\n\nReturn only valid JSON. No markdown or explanations.',
          messages: [
            {
              role: 'user',
              content: `Generate detailed specifications for these components:
            
${JSON.stringify(partsWithSpecs, null, 2)}

For each part, specify:
- Operating voltage
- Communication methods
- Number of input pins/ports
- Number of output pins/ports

Provide the JSON response:`,
            },
            {
              role: 'assistant',
              content: '{"partOrders":',
            },
          ],
          max_tokens: 3000,
        });
      } catch (opusError: any) {
        // If Opus is overloaded (529), try with Sonnet
        if (opusError?.status === 529) {
          console.log(
            '[WARN] Stage 2-1: Opus overloaded, falling back to Sonnet',
          );
          stage2_1_completion = await anthropic.messages.create({
            model: MODELS.SONNET,
            system:
              systemPrompt2_1 +
              '\n\nReturn only valid JSON. No markdown or explanations.',
            messages: [
              {
                role: 'user',
                content: `Generate detailed specifications for these components:
            
${JSON.stringify(partsWithSpecs, null, 2)}

For each part, specify:
- Operating voltage
- Communication methods
- Number of input pins/ports
- Number of output pins/ports

Provide the JSON response:`,
              },
              {
                role: 'assistant',
                content: '{"partOrders":',
              },
            ],
            max_tokens: 3000,
          });
        } else {
          throw opusError;
        }
      }

      let stage2_1_raw =
        stage2_1_completion.content[0]?.type === 'text'
          ? stage2_1_completion.content[0].text
          : '[]';

      // Clean any accidental markdown first
      if (stage2_1_raw.includes('```')) {
        stage2_1_raw = stage2_1_raw
          .replace(/```(?:json)?\s*/g, '')
          .replace(/```/g, '')
          .trim();
      }

      // Check if response already contains complete JSON
      stage2_1_raw = stage2_1_raw.trim();
      if (!stage2_1_raw.startsWith('{')) {
        // Partial response - add the prefilled start
        stage2_1_raw = '{"partOrders":' + stage2_1_raw;
      }

      const stage2_1_response = JSON.parse(stage2_1_raw);
      // CRITICAL: Force preserve categories from original parts, ignore AI's category changes
      detailedParts = (stage2_1_response.partOrders || partsWithSpecs).map(
        (part: any, idx: number) => ({
          ...part,
          // Always use the original category from Stage 1, never the AI-generated one
          category: partsWithSpecs[idx]?.category || 'control',
        }),
      );
      console.log(
        `[SUCCESS] Stage 2-1: Generated specs for ${detailedParts.length} parts`,
      );
      console.log(
        '[DEBUG] Stage 2-1 categories (forced from Stage 1):',
        detailedParts.map((p: any) => `${p.partName}: ${p.category}`),
      );
    } catch (error) {
      console.error('[ERROR] Stage 2-1 failed:', error);
      console.log('[WARN] Using basic specs from Stage 1');
      detailedParts = partsWithSpecs.map((part: any) => ({
        ...part,
        voltage: '5V',
        communication: 'GPIO',
        inputs: 2,
        outputs: 2,
      }));
    }

    // ========================================
    // ENHANCE PARTS WITH DYNAMIC PORTS (Moved before Stage 2-2)
    // ========================================
    console.log(
      '[DEBUG] Enhancing parts with dynamic ports before connection generation...',
    );

    // For enhancement, we need to use the original parts list to ensure all parts get enhanced
    // We'll map the enhanced specifications back to original parts
    let enhancedParts: Array<Record<string, any>> = detailedParts;

    // Create a map of deduplicated parts to their enhancements
    const enhancementMap = new Map<string, Record<string, any>>();

    try {
      // Generate dynamic ports for deduplicated parts
      const dedupedEnhanced = await enhancePartsOnServer(
        detailedParts,
        shippingDestination,
      );
      console.log(
        `[SUCCESS] Enhanced ${dedupedEnhanced.filter((p: any) => p.detailsFetched).length}/${dedupedEnhanced.length} deduplicated parts`,
      );

      // Store enhancements in map
      dedupedEnhanced.forEach((part: any) => {
        const normalizedName = part.partName.replace(/\s*\(x\d+\)/, '').trim();
        enhancementMap.set(normalizedName, part);
      });

      // Get timestamp from the first stage for consistency
      const timestamp = Date.now();

      // Now enhance the original parts using the deduplicated enhancements
      enhancedParts = originalParts.map((originalPart: any, index: number) => {
        // Skip if partName is missing
        if (!originalPart.partName) {
          console.warn(
            '[WARN] Skipping enhancement for part with missing partName:',
            originalPart,
          );
          return originalPart;
        }
        const baseName = originalPart.partName
          .replace(/\s+[A-Z]$/, '')
          .replace(/\s+\d+$/, '')
          .trim();
        const enhancement =
          enhancementMap.get(baseName) ||
          enhancementMap.get(originalPart.partName);

        if (enhancement) {
          // Apply enhancement to original part
          return {
            ...originalPart,
            ...enhancement,
            // Critical: Preserve original fields that enhancement might override
            partName: originalPart.partName, // Keep original name
            modelNumber: originalPart.modelNumber || enhancement.modelNumber,
            category:
              originalPart.category || enhancement.category || 'control', // Preserve category
            nodeId: `system-part-${timestamp}-${index}`, // Use timestamp for unique ID
          };
        } else {
          // No enhancement found, use basic part info
          return {
            ...originalPart,
            detailsFetched: false,
            category: originalPart.category || 'control', // Ensure category exists
            nodeId: `system-part-${timestamp}-${index}`, // Use timestamp for unique ID
          };
        }
      });

      console.log(
        `[SUCCESS] Applied enhancements to ${enhancedParts.length} original parts`,
      );
      console.log(
        '[DEBUG] Enhanced parts categories:',
        enhancedParts.map((p: any) => `${p.partName}: ${p.category}`),
      );

      // Log dynamic ports for debugging
      enhancedParts.forEach((part: any) => {
        if (part.dynamicPorts) {
          const totalPorts = part.dynamicPorts.portGroups.reduce(
            (sum: number, group: any) => sum + group.ports.length,
            0,
          );
          console.log(
            `[DEBUG] ${part.partName}: ${totalPorts} dynamic ports generated`,
          );
        }
      });
    } catch (error) {
      console.error('[ERROR] Part enhancement failed:', error);
      console.log('[WARN] Using parts without dynamic ports');
      enhancedParts = detailedParts;
    }

    // ========================================
    // STAGE 2-2: Generate system connections (with port information)
    // ========================================
    console.log(
      '[DEBUG] Stage 2-2: Generating system connections with port information...',
    );

    // Filter parts for connection generation if too many
    let partsForConnections = enhancedParts;
    const MAX_PARTS_FOR_CONNECTIONS = 5; // Limit to 5 main components for cleaner connections

    if (enhancedParts.length > MAX_PARTS_FOR_CONNECTIONS) {
      console.log(
        `[DEBUG] Too many parts (${enhancedParts.length}). Filtering to ${MAX_PARTS_FOR_CONNECTIONS} main components only...`,
      );

      // Priority-based selection
      const prioritizedParts: Array<Record<string, any>> = [];

      // Priority 1: Control system (max 1-2)
      const controlParts = enhancedParts.filter((part: any) => {
        const category = (part.category || '').toLowerCase();
        const name = (part.partName || '').toLowerCase();
        return (
          category === 'control' ||
          name.includes('arduino') ||
          name.includes('esp32') ||
          name.includes('raspberry') ||
          name.includes('stm32') ||
          name.includes('atmega') ||
          name.includes('teensy')
        );
      });
      if (controlParts.length > 0) {
        prioritizedParts.push(controlParts[0]); // Take first control unit
        // Add Raspberry Pi if present as secondary control
        const rpiPart = controlParts.find((p: any) =>
          p.partName.toLowerCase().includes('raspberry'),
        );
        if (rpiPart && rpiPart !== controlParts[0]) {
          prioritizedParts.push(rpiPart);
        }
      }

      // Priority 2: Sensors (max 1-2)
      const sensorParts = enhancedParts.filter((part: any) => {
        const category = (part.category || '').toLowerCase();
        const name = (part.partName || '').toLowerCase();
        return (
          category === 'sensor' ||
          name.includes('sensor') ||
          name.includes('imu') ||
          name.includes('ahrs') ||
          name.includes('3dm') ||
          name.includes('temperature')
        );
      });
      if (
        sensorParts.length > 0 &&
        prioritizedParts.length < MAX_PARTS_FOR_CONNECTIONS
      ) {
        prioritizedParts.push(sensorParts[0]);
      }

      // Priority 3: Actuators (max 1)
      const actuatorParts = enhancedParts.filter((part: any) => {
        const category = (part.category || '').toLowerCase();
        const name = (part.partName || '').toLowerCase();
        return (
          category === 'actuator' ||
          name.includes('servo') ||
          name.includes('motor') ||
          name.includes('pmx')
        );
      });
      if (
        actuatorParts.length > 0 &&
        prioritizedParts.length < MAX_PARTS_FOR_CONNECTIONS
      ) {
        prioritizedParts.push(actuatorParts[0]);
      }

      // Priority 4: Power supply (max 1)
      const powerParts = enhancedParts.filter((part: any) => {
        const category = (part.category || '').toLowerCase();
        const name = (part.partName || '').toLowerCase();
        return (
          category === 'power' ||
          name.includes('power') ||
          name.includes('battery') ||
          name.includes('regulator') ||
          name.includes('converter') ||
          name.includes('mp1584')
        );
      });
      if (
        powerParts.length > 0 &&
        prioritizedParts.length < MAX_PARTS_FOR_CONNECTIONS
      ) {
        prioritizedParts.push(powerParts[0]);
      }

      partsForConnections = prioritizedParts.slice(
        0,
        MAX_PARTS_FOR_CONNECTIONS,
      );

      console.log(
        `[DEBUG] Filtered from ${enhancedParts.length} to ${partsForConnections.length} main components for connections`,
      );
      console.log(
        '[DEBUG] Selected components:',
        partsForConnections.map((p: any) => `${p.partName} (${p.category})`),
      );
    }

    let systemConnections: Array<{
      id: string;
      source: string;
      sourceHandle: string;
      target: string;
      targetHandle: string;
      type: string;
    }> = [];
    try {
      // OpenAI implementation (commented out for Claude migration)
      /*
      const stage2_2_completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `You are a hardware system design expert.
Generate connections between components.

${buildConnectionTypePrompt()}

Return JSON format:
{
  "systemConnections": [
    {
      "id": "conn-1",
      "source": "part-index-0",
      "sourceHandle": "output",
      "target": "part-index-1",
      "targetHandle": "input",
      "type": "power/data/signal/mechanical"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Generate connections for these components. Use "part-index-N" where N is the component index (0-based):
${JSON.stringify(partsForConnections.map((p: any, i: number) => ({
  index: i,
  partName: p.partName,
  category: p.category,
  voltage: p.voltage,
  communication: p.communication
})), null, 2)}`
          }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
      })
      
      const stage2_2_response = JSON.parse(stage2_2_completion.choices[0]?.message?.content || '{}')
      */

      // Claude implementation
      const systemPrompt2_2 = `You are a hardware system design expert.
Generate connections between components.

${buildConnectionTypePrompt()}

Return JSON format:
{
  "systemConnections": [
    {
      "id": "conn-1",
      "source": "part-index-0",
      "sourceHandle": "output",
      "target": "part-index-1",
      "targetHandle": "input",
      "type": "power/data/signal/mechanical"
    }
  ]
}`;

      let stage2_2_completion;
      try {
        stage2_2_completion = await anthropic.messages.create({
          model: MODELS.OPUS,
          system:
            systemPrompt2_2 +
            '\n\nReturn only valid JSON. No markdown or explanations.',
          messages: [
            {
              role: 'user',
              content: `Generate connections for these components. Use "part-index-N" where N is the component index (0-based):
${JSON.stringify(
  partsForConnections.map((p: any, i: number) => ({
    index: i,
    partName: p.partName,
    category: p.category,
    voltage: p.voltage,
    communication: p.communication,
  })),
  null,
  2,
)}

Provide the JSON response:`,
            },
            {
              role: 'assistant',
              content: '{',
            },
          ],
          max_tokens: 2000,
        });
      } catch (opusError: any) {
        // If Opus is overloaded (529), try with Sonnet
        if (opusError?.status === 529) {
          console.log(
            '[WARN] Stage 2-2: Opus overloaded, falling back to Sonnet',
          );
          stage2_2_completion = await anthropic.messages.create({
            model: MODELS.SONNET,
            system:
              systemPrompt2_2 +
              '\n\nReturn only valid JSON. No markdown or explanations.',
            messages: [
              {
                role: 'user',
                content: `Generate connections for these components. Use "part-index-N" where N is the component index (0-based):
${JSON.stringify(
  partsForConnections.map((p: any, i: number) => ({
    index: i,
    partName: p.partName,
    category: p.category,
    voltage: p.voltage,
    communication: p.communication,
  })),
  null,
  2,
)}

Provide the JSON response:`,
              },
              {
                role: 'assistant',
                content: '{',
              },
            ],
            max_tokens: 2000,
          });
        } else {
          throw opusError;
        }
      }

      let stage2_2_raw =
        stage2_2_completion.content[0]?.type === 'text'
          ? stage2_2_completion.content[0].text
          : '[]';

      // Clean any accidental markdown first
      if (stage2_2_raw.includes('```')) {
        stage2_2_raw = stage2_2_raw
          .replace(/```(?:json)?\s*/g, '')
          .replace(/```/g, '')
          .trim();
      }

      // Check if response already contains complete JSON
      stage2_2_raw = stage2_2_raw.trim();

      // Remove any trailing characters after the last valid JSON bracket
      const lastBracket = stage2_2_raw.lastIndexOf('}');
      if (lastBracket !== -1 && lastBracket < stage2_2_raw.length - 1) {
        console.log(
          '[WARN] Trimming extra characters after JSON at position',
          lastBracket + 1,
        );
        stage2_2_raw = stage2_2_raw.substring(0, lastBracket + 1);
      }

      if (!stage2_2_raw.startsWith('{')) {
        // Partial response - add the prefilled start (same as Stage 1)
        stage2_2_raw = '{' + stage2_2_raw;
      }

      const stage2_2_response = JSON.parse(stage2_2_raw);
      systemConnections = stage2_2_response.systemConnections || [];

      // Debug: Check structure of connections
      console.log(
        '[DEBUG] Raw systemConnections:',
        JSON.stringify(systemConnections.slice(0, 2)),
      );

      // Map part indices to actual part IDs using the enhancedParts array
      // enhancedParts have the actual nodeId that will be used in the frontend
      systemConnections = systemConnections
        .map((conn: any) => {
          // Skip if essential properties are missing
          if (!conn || !conn.source || !conn.target) {
            console.warn('[WARN] Invalid connection structure:', conn);
            return null;
          }

          // Extract indices from source and target
          const sourceIndex = parseInt(conn.source.replace('part-index-', ''));
          const targetIndex = parseInt(conn.target.replace('part-index-', ''));

          // Get actual node IDs from partsForConnections (subset of enhancedParts)
          // Note: partsForConnections is the filtered list used for connection generation
          const sourceNodeId = partsForConnections[sourceIndex]?.nodeId;
          const targetNodeId = partsForConnections[targetIndex]?.nodeId;

          if (!sourceNodeId || !targetNodeId) {
            console.warn(
              `[WARN] Could not find node IDs for connection: source index ${sourceIndex}, target index ${targetIndex}`,
            );
            return null;
          }

          console.log(
            `[DEBUG] Mapping connection: ${conn.source} (${sourceIndex}) → ${sourceNodeId}, ${conn.target} (${targetIndex}) → ${targetNodeId}`,
          );

          return {
            ...conn,
            source: sourceNodeId,
            target: targetNodeId,
          };
        })
        .filter(Boolean); // Remove null entries

      console.log(
        `[SUCCESS] Stage 2-2: Generated ${systemConnections.length} connections`,
      );
    } catch (error) {
      console.error('[ERROR] Stage 2-2 failed:', error);
      console.log('[WARN] Creating minimal connections');
      systemConnections = [];
    }

    // ========================================
    // STAGE 2-3: Generate PBS structure and layout (programmatically, no AI)
    // ========================================
    console.log(
      '[DEBUG] Stage 2-3: Generating PBS structure and layout programmatically...',
    );

    let pbsStructure: Array<{
      id: string;
      name: string;
      type: string;
      icon?: string;
      children?: any[];
    }> = [];
    let nodeLayout: Array<{
      componentId: string;
      x: number;
      y: number;
      category: string;
      [key: string]: any; // Allow additional properties like nodeType, title, etc.
    }> = [];
    let designNotes: {
      summary: string;
      keyFeatures: string[];
      alternatives: any[];
      considerations: any[];
    } = {
      summary: '',
      keyFeatures: [],
      alternatives: [],
      considerations: [],
    };

    // Skip AI call completely and generate layout programmatically
    console.log(
      '[INFO] Skipping AI call for Stage 2-3, using programmatic layout generation',
    );

    // Create simple PBS structure
    pbsStructure = [
      {
        id: 'system',
        name: 'System',
        type: 'folder',
        children: enhancedParts.map((p: any, i: number) => ({
          id: `part-${i}`,
          name: p.partName,
          type: 'component',
        })),
      },
    ];

    // Category-based layout (1 row per category)
    const NODE_WIDTH = 360; // Actual node width (increased 50% from 240)
    const NODE_HEIGHT = 180; // Actual node height (increased 50% from 120)
    const SPACING_X = 45; // Horizontal spacing between nodes (increased from 30)
    const SPACING_Y = 75; // Vertical spacing between nodes (increased from 50)
    const MARGIN_X = 100; // Left margin
    const MARGIN_Y = 100; // Top margin
    const CATEGORY_GAP = 250; // Extra gap between categories (increased from 200)
    const CATEGORY_PADDING = 40; // Padding around category nodes

    // Group parts by category
    const categoryGroups: Record<string, Array<any>> = {};
    const categoryOrder = [
      'control',
      'sensor',
      'actuator',
      'communication',
      'power',
      'mechanical',
      'display',
      'storage',
    ];

    // Initialize category groups
    categoryOrder.forEach((cat) => {
      categoryGroups[cat] = [];
    });
    categoryGroups['other'] = []; // For uncategorized items

    // Expand parts by quantity and group by category
    let globalLayoutIndex = 0;
    const timestamp = Date.now(); // Add timestamp for unique IDs
    console.log(
      '[DEBUG] Layout input - Enhanced parts before grouping:',
      enhancedParts.map((p: any) => `${p.partName}: category=${p.category}`),
    );

    enhancedParts.forEach((part: any) => {
      const quantity = part.quantity || 1;
      // Normalize category to ensure it matches our predefined categories
      let category = (part.category || 'other').toLowerCase().trim();

      // Map common variations to standard categories
      if (
        category === 'servo_motor' ||
        category === 'motor' ||
        category === 'servo'
      ) {
        category = 'actuator';
      } else if (
        category === 'computing' ||
        category === 'computing_platform' ||
        category === 'microcontroller'
      ) {
        category = 'control';
      } else if (
        category === 'battery' ||
        category === 'power_supply' ||
        category === 'converter'
      ) {
        category = 'power';
      } else if (
        category === 'wifi' ||
        category === 'bluetooth' ||
        category === 'communication_module'
      ) {
        category = 'communication';
      } else if (
        category === 'imu' ||
        category === 'ahrs' ||
        category === 'gyro' ||
        category === 'accelerometer'
      ) {
        category = 'sensor';
      } else if (
        category === 'frame' ||
        category === 'chassis' ||
        category === 'structure'
      ) {
        category = 'mechanical';
      }

      // Ensure category is valid
      if (!categoryOrder.includes(category)) {
        console.log(
          `[DEBUG] Unknown category '${category}' for ${part.partName}, using 'other'`,
        );
        category = 'other';
      }

      for (let q = 0; q < quantity; q++) {
        const expandedPart = {
          ...part,
          componentId: `system-part-${timestamp}-${globalLayoutIndex}`, // Unique ID with timestamp
          globalIndex: globalLayoutIndex,
        };

        if (categoryGroups[category]) {
          categoryGroups[category].push(expandedPart);
        } else {
          categoryGroups['other'].push(expandedPart);
        }

        globalLayoutIndex++;
      }
    });

    // Layout each category group
    const layoutResults: Array<any> = [];
    const categoryNodeLayouts: Array<any> = [];
    let currentY = MARGIN_Y;

    // Process categories in order
    categoryOrder.concat(['other']).forEach((category) => {
      const parts = categoryGroups[category];
      if (parts.length === 0) return;

      console.log(`[Layout] Category "${category}": ${parts.length} parts`);

      // Calculate category bounds (for single row)
      const categoryStartY = currentY;
      const categoryHeight = NODE_HEIGHT; // Single row height
      const categoryWidth = parts.length * (NODE_WIDTH + SPACING_X) - SPACING_X; // Width based on number of parts

      // Add category node layout
      const categoryNodeId = `category-${category}-${timestamp}`; // Use same timestamp for consistency
      categoryNodeLayouts.push({
        componentId: categoryNodeId,
        x: MARGIN_X - CATEGORY_PADDING, // Offset for padding
        y: categoryStartY - CATEGORY_PADDING, // Offset for padding
        width: categoryWidth + CATEGORY_PADDING * 2, // Add padding
        height: categoryHeight + CATEGORY_PADDING * 2, // Add padding
        nodeType: 'category',
        title: category.charAt(0).toUpperCase() + category.slice(1) + ' System',
        category: category,
      });

      // Layout parts in this category (1 row layout)
      parts.forEach((part, index) => {
        layoutResults.push({
          componentId: part.componentId,
          x: MARGIN_X + index * (NODE_WIDTH + SPACING_X), // All in one row
          y: currentY, // Same Y coordinate for all parts in category
          category: part.category || 'control',
          categoryId: categoryNodeId, // Link to category node
        });
      });

      // Calculate next category's Y position (single row + gap)
      currentY += NODE_HEIGHT + CATEGORY_GAP;
    });

    // Combine category nodes and component nodes
    nodeLayout = [...categoryNodeLayouts, ...layoutResults];

    // Debug: Verify category nodes are included
    console.log('[DEBUG] Final nodeLayout:', {
      total: nodeLayout.length,
      categoryNodes: nodeLayout.filter((n) => n.nodeType === 'category').length,
      componentNodes: nodeLayout.filter((n) => n.nodeType !== 'category')
        .length,
      categories: nodeLayout
        .filter((n) => n.nodeType === 'category')
        .map((n) => n.title),
    });

    // Get design notes from Stage 1 response
    designNotes = {
      summary: partsListResponse.summary || 'Hardware system design',
      keyFeatures: partsListResponse.keyRequirements || [],
      alternatives: [],
      considerations: [],
    };

    console.log(
      `[SUCCESS] Stage 2-3: Generated layout with ${nodeLayout.length} nodes (${categoryNodeLayouts.length} categories, ${layoutResults.length} components)`,
    );

    // Combine all results (using enhancedParts with dynamic ports)
    const jsonResponse: any = {
      pbsStructure,
      partOrders: enhancedParts, // Use enhanced parts with dynamic ports
      systemConnections,
      nodeLayout,
      designNotes,
      generatedAt: new Date().toISOString(),
      projectId,
    };

    // Validate essential fields exist
    if (
      !jsonResponse.pbsStructure ||
      !jsonResponse.partOrders ||
      !jsonResponse.systemConnections ||
      !jsonResponse.nodeLayout
    ) {
      throw new Error('Missing required fields in response');
    }

    // Format voltage for all parts
    jsonResponse.partOrders = jsonResponse.partOrders.map((part: any) => {
      if (part.voltage) {
        part.voltage = formatVoltage(part.voltage);
      }
      return part;
    });

    console.log(`[DEBUG] System design generated for project: ${projectId}`);
    console.log(
      `[DEBUG] Generated ${jsonResponse.partOrders?.length || 0} parts`,
    );
    console.log(
      `[DEBUG] Generated ${jsonResponse.systemConnections?.length || 0} connections`,
    );

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('System generation error:', error);
    console.error('[ERROR] Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });
    return NextResponse.json(
      {
        error: 'Failed to generate system design',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 },
    );
  }
}
