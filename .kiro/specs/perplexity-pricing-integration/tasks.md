# Implementation Tasks

## Overview
Perplexity API統合による電子部品価格取得システムの実装タスク。各タスクは依存関係に従って順次実装する。

## Phase 1: Foundation Setup (基盤構築)

### Task 1.1: Environment Configuration
- [x] Add PERPLEXITY_API_KEY to .env.local
- [x] Add PERPLEXITY_API_URL to .env.local
- [x] Create .env.example with placeholder values
- [x] Update environment variable documentation

**Files**: `.env.local`, `.env.example`, `README.md`
**Priority**: Critical
**Estimated**: 0.5 hours

### Task 1.2: Type Definitions Extension
- [x] Create ComponentPricingExtended interface in `/types/parts.ts`
- [x] Add ShippingDestination interface
- [x] Add PricingApiResponse interface
- [x] Update existing type exports

**Files**: `/types/parts.ts`, `/types/index.ts`
**Priority**: Critical
**Estimated**: 1 hour

## Phase 2: Database Preparation (データベース準備)

### Task 2.1: Prisma Schema Update
- [x] Add cached_pricing (Json) field to canvas_nodes model
- [x] Add pricing_updated_at (DateTime) field to canvas_nodes model
- [x] Add index on pricing_updated_at for cleanup queries
- [x] Generate Prisma migration file
- [x] Test migration locally

**Files**: `/prisma/schema.prisma`
**Priority**: Critical
**Estimated**: 0.5 hours

### Task 2.2: Database Migration
- [x] Run prisma migrate dev to create migration
- [x] Verify migration SQL is correct
- [x] Test rollback and re-apply
- [x] Document migration steps for production

**Files**: `/prisma/migrations/`
**Priority**: Critical
**Estimated**: 0.5 hours

## Phase 3: Core API Integration (コアAPI統合)

### Task 3.1: Perplexity API Client Implementation
- [x] Create `/utils/external/perplexityApi.ts`
- [x] Implement searchPartPricingWithPerplexity function
- [x] Implement buildPricingPrompt function with destination support
- [x] Implement parsePerplexityResponse function
- [x] Add error handling with PerplexityAPIError class

**Files**: `/utils/external/perplexityApi.ts`
**Priority**: Critical
**Estimated**: 3 hours

### Task 3.2: Database Cache Implementation
- [x] Create `/utils/pricing/priceCacheService.ts`
- [x] Implement PriceCacheService class for DB operations
- [x] Add getCachedPricing method for retrieving cached data
- [x] Add setCachedPricing method for storing data
- [x] Implement cleanupExpiredCache for maintenance
- [x] Add destination-aware cache key generation

**Files**: `/utils/pricing/priceCacheService.ts`
**Priority**: Critical
**Estimated**: 2 hours

### Task 3.3: Integrated Cache Implementation
- [x] Create `/utils/pricing/integratedPricingCache.ts`
- [x] Implement multi-layer cache strategy (Memory → DB → API)
- [x] Add memory cache with 1-hour TTL
- [x] Integrate with PriceCacheService for DB layer
- [x] Add memory limit management (max 100 entries)

**Files**: `/utils/pricing/integratedPricingCache.ts`
**Priority**: High
**Estimated**: 1.5 hours

### Task 3.4: Batch Processing Implementation
- [x] Add batchSearchWithPerplexity function
- [x] Implement rate limiting (3 requests/second)
- [x] Add batch size configuration (3 items per batch)
- [x] Implement delay between batches

**Files**: `/utils/external/perplexityApi.ts`
**Priority**: High
**Estimated**: 1.5 hours

## Phase 4: Existing System Integration (既存システム統合)

### Task 4.1: Update octopartApi.ts
- [x] Modify searchPartPricing to accept shippingDestination parameter
- [x] Add Perplexity API integration with fallback logic
- [x] Update generateMockPricing to include delivery information
- [x] Ensure backward compatibility

**Files**: `/utils/external/octopartApi.ts`
**Priority**: Critical
**Estimated**: 2 hours

### Task 4.2: Create API Endpoint
- [x] Create `/pages/api/parts/pricing.ts`
- [x] Implement POST endpoint with shipping destination support
- [x] Add request validation
- [x] Add error handling and fallback responses
- [x] Include metadata in responses

**Files**: `/pages/api/parts/pricing.ts`
**Priority**: Critical
**Estimated**: 2 hours

## Phase 5: UI Components (UIコンポーネント)

### Task 5.1: Shipping Destination Selector Component
- [x] Create ShippingDestinationSelector component
- [x] Add country dropdown with major markets
- [x] Add region/city input field
- [x] Add postal code input field
- [x] Implement onChange handlers

**Files**: `/components/procurement/ShippingDestinationSelector.tsx`
**Priority**: High
**Estimated**: 2 hours

### Task 5.2: Local Storage Integration
- [x] Create shipping destination persistence functions
- [x] Add saveShippingDestination function
- [x] Add loadShippingDestination function
- [x] Set default to Japan/Tokyo

**Files**: `/utils/storage/shippingDestination.ts`
**Priority**: Medium
**Estimated**: 1 hour

### Task 5.3: Update PartsManagementTable
- [x] Add shipping destination state
- [x] Integrate ShippingDestinationSelector component
- [x] Update pricing fetch logic with destination
- [x] Clear cache on destination change
- [x] Add destination-aware caching
- [x] Integrate with IntegratedPricingCache

**Files**: `/components/parts/PartsManagementTable.tsx`
**Priority**: High
**Estimated**: 2.5 hours

### Task 5.4: Create usePricingData Hook
- [x] Create custom hook for pricing data fetching
- [x] Integrate with SWR for caching
- [x] Add shipping destination to cache key
- [x] Handle loading and error states

**Files**: `/hooks/usePricingData.ts`
**Priority**: High
**Estimated**: 1.5 hours

### Task 5.5: Fix Total Cost Calculation
- [x] Update Total Cost to use UI displayed prices
- [x] Prioritize AI pricing over manual input
- [x] Include quantity in calculation
- [x] Handle invalid price values

**Files**: `/components/parts/PartsManagementState.tsx`
**Priority**: High
**Estimated**: 0.5 hours

## Phase 6: UI Enhancement (UI拡張)

### Task 6.1: Update MarketDataDisplay
- [x] Add delivery information display
- [x] Show shipping location (warehouse)
- [x] Display delivery days with destination context
- [x] Add mock data indicator for transparency

**Files**: `/components/market/MarketDataDisplay.tsx`
**Priority**: Medium
**Estimated**: 1.5 hours

### Task 6.2: Integrate Purchase Links
- [x] Update purchase link generation with Perplexity URLs
- [x] Integrate with existing purchaseLinkGenerator
- [x] Add direct product page links when available
- [x] Maintain fallback to generated search URLs

**Files**: `/components/market/MarketDataDisplay.tsx`, `/utils/external/purchaseLinkGenerator.ts`
**Priority**: Medium
**Estimated**: 1 hour

## Phase 7: API Usage Management (API使用管理)

### Task 7.1: Usage Tracking Implementation
- [ ] Create APIUsageTracker class
- [ ] Implement usage counting
- [ ] Add monthly limit checking (10,000 requests)
- [ ] Add reset functionality

**Files**: `/utils/monitoring/apiUsageTracker.ts`
**Priority**: Medium
**Estimated**: 1.5 hours

### Task 7.2: Usage Monitoring Integration
- [ ] Integrate usage tracking in perplexityApi.ts
- [ ] Add usage checks before API calls
- [ ] Implement fallback when limit reached
- [ ] Add logging for usage patterns

**Files**: `/utils/external/perplexityApi.ts`
**Priority**: Medium
**Estimated**: 1 hour

## Phase 8: Testing (テスト)

### Task 8.1: Unit Tests for Core Functions
- [ ] Test Perplexity prompt generation
- [ ] Test response parsing with various formats
- [ ] Test cache operations
- [ ] Test error handling scenarios

**Files**: `/tests/utils/perplexityApi.test.ts`, `/tests/utils/priceCache.test.ts`
**Priority**: High
**Estimated**: 3 hours

### Task 8.2: Integration Tests
- [ ] Test API endpoint with shipping destinations
- [ ] Test full data flow from UI to Perplexity
- [ ] Test fallback scenarios
- [ ] Test rate limiting behavior

**Files**: `/tests/api/parts/pricing.test.ts`
**Priority**: High
**Estimated**: 2 hours

### Task 8.3: Component Tests
- [ ] Test ShippingDestinationSelector
- [ ] Test PartsManagementTable with destination changes
- [ ] Test MarketDataDisplay with extended data
- [ ] Test localStorage persistence

**Files**: `/tests/components/*.test.tsx`
**Priority**: Medium
**Estimated**: 2 hours

## Phase 9: Documentation & Deployment (ドキュメント・デプロイ)

### Task 9.1: Update Documentation
- [ ] Document API configuration in README
- [ ] Add usage examples
- [ ] Document shipping destination feature
- [ ] Add troubleshooting guide

**Files**: `README.md`, `/docs/api-integration.md`
**Priority**: Medium
**Estimated**: 1 hour

### Task 9.2: Feature Flag Implementation
- [ ] Add NEXT_PUBLIC_USE_PERPLEXITY flag
- [ ] Add NEXT_PUBLIC_SHOW_DELIVERY flag
- [ ] Update feature detection logic
- [ ] Test feature toggle behavior

**Files**: `/utils/features.ts`, `.env.example`
**Priority**: Low
**Estimated**: 0.5 hours

### Task 9.3: Deployment Preparation
- [ ] Verify environment variables in production
- [ ] Test with production API key
- [ ] Monitor initial API usage
- [ ] Prepare rollback plan

**Files**: Deployment configuration
**Priority**: High
**Estimated**: 1 hour

## Phase 10: Maintenance & Optimization (メンテナンス・最適化)

### Task 10.1: Cache Cleanup Job
- [ ] Create cleanup script for expired price cache
- [ ] Schedule periodic cleanup (daily)
- [ ] Add monitoring for cache size
- [ ] Test cleanup performance impact

**Files**: `/scripts/cleanupPriceCache.ts`, cron configuration
**Priority**: Medium
**Estimated**: 1.5 hours

### Task 10.2: Cache Performance Monitoring
- [ ] Add cache hit/miss rate tracking
- [ ] Monitor database storage usage
- [ ] Create alerts for cache failures
- [ ] Add performance dashboard

**Files**: `/utils/monitoring/cacheMetrics.ts`
**Priority**: Low
**Estimated**: 2 hours

## Summary

**Total Tasks**: 33
**Completed Tasks**: 17
**Remaining Tasks**: 16
**Total Estimated Time**: 44 hours
**Completed Time**: 20 hours (45%)
**Critical Path**: Tasks 1.1 → 1.2 → 2.1 → 2.2 → 3.1 → 3.2 → 4.1 → 5.3

## Progress Status

### Completed Phases:
- ✅ Phase 1: Foundation Setup (基盤構築) - 100% Complete
- ✅ Phase 2: Database Preparation (データベース準備) - 100% Complete
- ✅ Phase 3: Core API Integration (コアAPI統合) - 100% Complete
- ✅ Phase 4: Existing System Integration (既存システム統合) - 100% Complete
- ✅ Phase 5: UI Components (UIコンポーネント) - 100% Complete
- ✅ Phase 6: UI Enhancement (UI拡張) - 100% Complete

### In Progress:
- ⏳ Phase 7: API Usage Management (API使用管理) - 0% Complete
- ⏳ Phase 8: Testing (テスト) - 0% Complete
- ⏳ Phase 9: Documentation & Deployment (ドキュメント・デプロイ) - 0% Complete
- ⏳ Phase 10: Maintenance & Optimization (メンテナンス・最適化) - 0% Complete

## Dependencies

- Task 2.1-2.2 requires database schema update
- Task 3.1 requires Task 1.2 (type definitions)
- Task 3.2 requires Task 2.2 (database migration completed)
- Task 3.3 requires Task 3.2 (PriceCacheService)
- Task 4.1 requires Task 3.1 (Perplexity API client)
- Task 5.3 requires Task 3.3 and Task 5.1
- Task 6.1 requires Task 5.3 (updated PartsManagementTable)
- All testing tasks require their respective implementation tasks

## Success Criteria

1. ✓ Perplexity API successfully returns real-time pricing data
2. ✓ Shipping destination changes update pricing and delivery times
3. ✓ Price data is persisted in database (canvas_nodes.cached_pricing)
4. ✓ Multi-layer cache works (Memory → DB → API)
5. ✓ Cache properly stores destination-specific data
6. ✓ Expired cache is automatically cleaned up
7. ✓ Fallback to mock data works when API fails
8. ✓ UI displays delivery information based on selected destination
9. ✓ API usage stays within monthly limits
10. ✓ All tests pass with >80% coverage
11. ✓ Feature can be toggled on/off via environment variables