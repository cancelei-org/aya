#!/usr/bin/env node

// 簡略化版：DynamicPortSystemを使わずに直接データを投入

import { prisma } from '../lib/prisma';
import { PRESET_COMPONENTS } from '../utils/data/presetComponents';

async function main() {
  console.log('🚀 Starting component specification seeding (simplified)...');

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const component of PRESET_COMPONENTS) {
    try {
      // 既存のコンポーネントを確認
      const existing = await prisma.componentSpecification.findUnique({
        where: { partName: component.partName },
      });

      // 簡略化されたポート設定
      const simpleDynamicPorts = {
        portGroups: [
          {
            name: 'GPIO',
            ports: [],
          },
        ],
      };

      const data = {
        partName: component.partName,
        modelNumber: component.modelNumber || null,
        category: component.category,
        manufacturer: component.manufacturer,
        specification: component.specification as Record<string, unknown>,
        dynamicPorts: simpleDynamicPorts as Record<string, unknown>, // 後でランタイムで生成
        isPreset: true,
        confidence: 1.0,
      };

      if (existing) {
        // 既存の場合は更新
        await prisma.componentSpecification.update({
          where: { id: existing.id },
          data,
        });
        results.updated++;
        console.log(`✅ Updated: ${component.partName}`);
      } else {
        // 新規作成
        await prisma.componentSpecification.create({
          data,
        });
        results.created++;
        console.log(`✅ Created: ${component.partName}`);
      }
    } catch (error) {
      const errorMessage = `Failed to process ${component.partName}: ${error}`;
      console.error(`❌ ${errorMessage}`);
      results.errors.push(errorMessage);
      results.skipped++;
    }
  }

  console.log('\n📊 Seeding completed:');
  console.log(`  Created: ${results.created}`);
  console.log(`  Updated: ${results.updated}`);
  console.log(`  Skipped: ${results.skipped}`);
  console.log(`  Total: ${PRESET_COMPONENTS.length}`);

  if (results.errors.length > 0) {
    console.log('\n⚠️ Errors:');
    results.errors.forEach((err) => console.log(`  - ${err}`));
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
