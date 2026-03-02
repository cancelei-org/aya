import { batchSearchSpecifications } from '../batchEnhancer';
import type { PartSpecification } from '../../types/hardwareAnalysis';

// Mock the AI service
jest.mock('../core/aiSpecificationService', () => ({
  AISpecificationService: {
    getInstance: () => ({
      openai: {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      results: [
                        {
                          name: 'ESP32',
                          voltage: { operating: ['3.3V'], typical: '3.3V' },
                          communication: {
                            protocols: ['WiFi', 'Bluetooth', 'I2C', 'SPI'],
                          },
                          io: { digital: 34, analog: 18, pwm: 16 },
                        },
                        {
                          name: 'DHT22',
                          voltage: { operating: ['3.3V', '5V'], typical: '5V' },
                          communication: { protocols: ['OneWire'] },
                          io: { digital: 1, analog: 0, pwm: 0 },
                        },
                        {
                          name: 'OLED Display',
                          voltage: {
                            operating: ['3.3V', '5V'],
                            typical: '3.3V',
                          },
                          communication: { protocols: ['I2C', 'SPI'] },
                          io: { digital: 0, analog: 0, pwm: 0 },
                        },
                        {
                          name: 'Relay Module',
                          voltage: { operating: ['5V'], typical: '5V' },
                          communication: { protocols: ['GPIO'] },
                          io: { digital: 1, analog: 0, pwm: 0 },
                        },
                        {
                          name: 'Power Supply',
                          voltage: { operating: ['12V'], typical: '12V' },
                          communication: { protocols: [] },
                          io: { digital: 0, analog: 0, pwm: 0 },
                        },
                      ],
                    }),
                  },
                },
              ],
            }),
          },
        },
      },
    }),
  },
}));

describe('batchSearchSpecifications', () => {
  it('should process 5 parts in a single batch', async () => {
    const parts: PartSpecification[] = [
      {
        partName: 'ESP32',
        category: 'control',
        description: 'WiFi microcontroller',
      },
      {
        partName: 'DHT22',
        category: 'sensor',
        description: 'Temperature sensor',
      },
      {
        partName: 'OLED Display',
        category: 'display',
        description: '128x64 display',
      },
      {
        partName: 'Relay Module',
        category: 'actuator',
        description: '4-channel relay',
      },
      {
        partName: 'Power Supply',
        category: 'power',
        description: '12V adapter',
      },
    ] as PartSpecification[];

    const results = await batchSearchSpecifications(parts);

    // Should return a map with all 5 parts
    expect(results.size).toBe(5);

    // Check ESP32 specification
    const esp32 = results.get('ESP32');
    expect(esp32).toBeTruthy();
    expect(esp32?.specification.voltage.operating).toContain('3.3V');
    expect(esp32?.specification.communication.protocols).toContain('WiFi');
    expect(esp32?.specification.io.digital).toBe(34);

    // Check DHT22 specification
    const dht22 = results.get('DHT22');
    expect(dht22).toBeTruthy();
    expect(dht22?.specification.communication.protocols).toContain('OneWire');
  });

  it('should handle batches larger than 5 by splitting them', async () => {
    const parts: PartSpecification[] = [];
    for (let i = 1; i <= 12; i++) {
      parts.push({
        partName: `Part${i}`,
        category: 'sensor',
        description: `Test part ${i}`,
      } as PartSpecification);
    }

    const results = await batchSearchSpecifications(parts);

    // Should process all 12 parts (3 batches: 5, 5, 2)
    expect(results.size).toBe(12);
  });

  it('should handle empty input', async () => {
    const results = await batchSearchSpecifications([]);
    expect(results.size).toBe(0);
  });

  it('should handle batch failures gracefully', async () => {
    // Create new mock for this test
    jest.resetModules();
    jest.doMock('../core/aiSpecificationService', () => ({
      AISpecificationService: {
        getInstance: () => ({
          openai: {
            chat: {
              completions: {
                create: jest.fn().mockRejectedValue(new Error('API Error')),
              },
            },
          },
        }),
      },
    }));

    // Re-import to get the mocked version
    const { batchSearchSpecifications: batchSearchSpecificationsMocked } =
      await import('../batchEnhancer');

    const parts: PartSpecification[] = [
      { partName: 'Part1', category: 'sensor' },
      { partName: 'Part2', category: 'sensor' },
    ] as PartSpecification[];

    const results = await batchSearchSpecificationsMocked(parts);

    // Failed batch should return null for all parts in that batch
    expect(results.get('Part1')).toBeNull();
    expect(results.get('Part2')).toBeNull();
  });
});
