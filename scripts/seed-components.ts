#!/usr/bin/env node

// スクリプトでデータベースに事前登録コンポーネントを投入

import { prisma } from '../lib/prisma';
import { PRESET_COMPONENTS } from '../utils/data/presetComponents';
import { DynamicPortSystem } from '../utils/connections/ports/dynamicPortSystem';
const dynamicPortSystem = new DynamicPortSystem();

async function main() {
  console.log('🚀 Starting component specification seeding...');

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

      // ダイナミックポート設定を生成
      const nodeId = `preset-${component.partName.toLowerCase().replace(/\s+/g, '-')}`;
      const dynamicPorts = dynamicPortSystem.generatePortsFromSpecification(
        nodeId,
        component.specification,
      );

      const data = {
        partName: component.partName,
        modelNumber: component.modelNumber || null,
        category: component.category,
        manufacturer: component.manufacturer,
        specification: component.specification as Record<string, unknown>,
        dynamicPorts: dynamicPorts as Record<string, unknown>,
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
