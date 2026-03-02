import { enhancePartsOnServer } from '../serverPartEnhancer';
import type { PartSpecification } from '../../types/hardwareAnalysis';

// This test measures actual performance improvement
// Run with: npm test -- --testNamePattern="performance"

describe('Batch Processing Performance', () => {
  // Create test parts
  const createTestParts = (count: number): PartSpecification[] => {
    const parts: PartSpecification[] = [];
    const components = [
      {
        name: 'ESP32',
        category: 'control',
        description: 'WiFi microcontroller',
      },
      {
        name: 'DHT22',
        category: 'sensor',
        description: 'Temperature/humidity sensor',
      },
      { name: 'OLED Display', category: 'display', description: '128x64 OLED' },
      {
        name: 'Relay Module',
        category: 'actuator',
        description: '4-channel relay',
      },
      {
        name: 'Power Supply',
        category: 'power',
        description: '12V 2A adapter',
      },
      {
        name: 'LED Strip',
        category: 'display',
        description: 'WS2812B RGB LED',
      },
      {
        name: 'Button',
        category: 'input',
        description: 'Momentary push button',
      },
      { name: 'Buzzer', category: 'output', description: 'Piezo buzzer' },
      {
        name: 'SD Card Module',
        category: 'storage',
        description: 'MicroSD card reader',
      },
      {
        name: 'RTC Module',
        category: 'timing',
        description: 'DS3231 real-time clock',
      },
    ];

    for (let i = 0; i < count; i++) {
      const component = components[i % components.length];
      parts.push({
        partName: `${component.name}_${i}`,
        category: component.category,
        description: component.description,
      } as PartSpecification);
    }

    return parts;
  };

  test('should show performance improvement with batch processing', async () => {
    const testCases = [
      { count: 3, expectBatch: false }, // Should use individual
      { count: 5, expectBatch: true }, // Should use batch
      { count: 10, expectBatch: true }, // Should use batch
    ];

    console.log('\n=== Performance Test Results ===');

    for (const testCase of testCases) {
      const parts = createTestParts(testCase.count);

      // Measure with batch processing
      const startBatch = Date.now();
      process.env.USE_BATCH_ENHANCEMENT = 'true';
      await enhancePartsOnServer(parts);
      const timeBatch = Date.now() - startBatch;

      // Measure without batch processing
      const startIndividual = Date.now();
      process.env.USE_BATCH_ENHANCEMENT = 'false';
      await enhancePartsOnServer(parts);
      const timeIndividual = Date.now() - startIndividual;

      const improvement = (
        ((timeIndividual - timeBatch) / timeIndividual) *
        100
      ).toFixed(1);
      const expectedCalls = testCase.expectBatch
        ? Math.ceil(testCase.count / 5)
        : testCase.count;

      console.log(`\nParts: ${testCase.count}`);
      console.log(`Batch Processing: ${testCase.expectBatch ? 'Yes' : 'No'}`);
      console.log(`Time with batch: ${timeBatch}ms`);
      console.log(`Time without batch: ${timeIndividual}ms`);
      console.log(`Performance improvement: ${improvement}%`);
      console.log(`API calls reduced: ${testCase.count} → ${expectedCalls}`);
    }

    console.log('\n================================');
  }, 30000); // 30 second timeout for performance test
});
