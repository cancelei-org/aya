#!/usr/bin/env node

// 事前登録コンポーネントのルックアップテスト

import { prisma } from '../lib/prisma';

async function main() {
  console.log('🔍 Testing preset component lookup...\n');

  // テストする部品名
  const testParts = [
    'Arduino Uno R3',
    'ESP32-DevKitC',
    'Raspberry Pi 4 Model B',
    'Teensy 4.1',
    'Random Unknown Part', // 存在しない部品
  ];

  for (const partName of testParts) {
    console.log(`\nLooking for: ${partName}`);

    try {
      // 大文字小文字を無視して検索
      const result = await prisma.componentSpecification.findFirst({
        where: {
          OR: [
            { partName: { equals: partName, mode: 'insensitive' } },
            { modelNumber: { equals: partName, mode: 'insensitive' } },
          ],
          isPreset: true,
        },
      });

      if (result) {
        console.log(`✅ Found in database`);
        console.log(`  - Category: ${result.category}`);
        console.log(`  - Manufacturer: ${result.manufacturer}`);

        const spec = result.specification as {
          voltage?: { operating?: string[] };
          communication?: { protocols?: string[] };
          io?: { digital?: number; analog?: number; pwm?: number };
        };
        if (spec?.voltage?.operating) {
          console.log(`  - Voltage: ${spec.voltage.operating.join(', ')}`);
        }
        if (spec?.communication?.protocols) {
          console.log(
            `  - Protocols: ${spec.communication.protocols.slice(0, 3).join(', ')}...`,
          );
        }
        if (spec?.io) {
          console.log(
            `  - I/O: ${spec.io.digital || 0} digital, ${spec.io.analog || 0} analog, ${spec.io.pwm || 0} PWM`,
          );
        }
      } else {
        console.log(`❌ Not found in database`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }

  // データベースの統計
  console.log('\n=== Database Statistics ===\n');

  const totalPreset = await prisma.componentSpecification.count({
    where: { isPreset: true },
  });

  const byCategory = await prisma.componentSpecification.groupBy({
    by: ['category'],
    where: { isPreset: true },
    _count: true,
  });

  console.log(`Total preset components: ${totalPreset}`);
  console.log('\nBy category:');
  byCategory.forEach((cat) => {
    console.log(`  - ${cat.category}: ${cat._count}`);
  });

  // パフォーマンステスト
  console.log('\n=== Performance Test ===\n');

  const iterations = 100;
  const testPart = 'Arduino Uno R3';

  const startTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    await prisma.componentSpecification.findFirst({
      where: {
        partName: { equals: testPart, mode: 'insensitive' },
        isPreset: true,
      },
    });
  }
  const endTime = Date.now();

  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;

  console.log(`Lookup performance (${iterations} iterations):`);
  console.log(`  - Total time: ${totalTime}ms`);
  console.log(`  - Average time per lookup: ${avgTime.toFixed(2)}ms`);

  if (avgTime < 5) {
    console.log(`  - ✅ Excellent performance`);
  } else if (avgTime < 20) {
    console.log(`  - ⚠️ Acceptable performance`);
  } else {
    console.log(`  - ❌ Poor performance - consider adding indexes`);
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
