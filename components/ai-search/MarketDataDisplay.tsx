'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  Package,
  TrendingUp,
  ExternalLink,
  Download,
  Star,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Truck,
  MapPin,
} from 'lucide-react';
import type {
  PricingInfo,
  LibraryInfo,
} from '@/utils/external/externalApiService';

export interface MarketDataDisplayProps {
  componentName: string;
  pricingData?: PricingInfo;
  libraryData?: LibraryInfo;
  lastUpdated?: string;
  showPricingDetails?: boolean;
  showLibraryDetails?: boolean;
  shippingDestination?: { country: string; region?: string };
  onPriceClick?: (supplier: string, url: string) => void;
  onLibraryClick?: (library: {
    name: string;
    platform: string;
    downloads?: number;
    url?: string;
  }) => void;
}

export const MarketDataDisplay: React.FC<MarketDataDisplayProps> = ({
  componentName,
  pricingData,
  libraryData,
  lastUpdated,
  showPricingDetails = false,
  showLibraryDetails = false,
  shippingDestination,
  onPriceClick,
  onLibraryClick,
}) => {
  const [showPricing, setShowPricing] = useState(showPricingDetails);
  const [showLibraries, setShowLibraries] = useState(showLibraryDetails);

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'in_stock':
        return 'text-green-600 bg-green-100';
      case 'limited':
        return 'text-yellow-600 bg-yellow-100';
      case 'out_of_stock':
        return 'text-red-600 bg-red-100';
      case 'discontinued':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!pricingData && !libraryData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Info className="h-4 w-4" />
          <span className="text-sm">
            No market data available for {componentName}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Market Data: {componentName}
          </h3>
          <div className="flex items-center gap-4">
            {shippingDestination && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="h-3 w-3" />
                <span>
                  {shippingDestination.country}
                  {shippingDestination.region &&
                    ` ${shippingDestination.region}`}
                </span>
              </div>
            )}
            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                Updated {new Date(lastUpdated).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      {pricingData && (
        <div className="border-b border-gray-200">
          <button
            onClick={() => setShowPricing(!showPricing)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">
                  Pricing Information
                </div>
                <div className="text-sm text-gray-600">
                  Avg: {formatPrice(pricingData.averagePrice)}
                  <span className="mx-2">•</span>
                  Range: {formatPrice(pricingData.priceRange.min)} -{' '}
                  {formatPrice(pricingData.priceRange.max)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {pricingData.prices.length} sources
              </span>
              {showPricing ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>

          {showPricing && (
            <div className="px-4 pb-4 space-y-2">
              {/* Recommended Supplier */}
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2 text-green-800 text-sm font-medium mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Recommended Supplier
                </div>
                <div className="text-green-700">
                  {pricingData.recommendedSupplier}
                </div>
              </div>

              {/* Price List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pricingData.prices.map((price, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors ${
                      price.supplier === pricingData.recommendedSupplier
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => onPriceClick?.(price.supplier, price.url)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {price.supplier}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <span>Qty: {price.quantity}</span>
                          <span>•</span>
                          <span>Lead: {price.leadTime}</span>
                        </div>
                        {'deliveryDays' in price &&
                        (price as any).deliveryDays ? (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            <Truck className="h-3 w-3" />
                            <span>配送: {(price as any).deliveryDays}日</span>
                            {'shippingLocation' in price &&
                            (price as any).shippingLocation ? (
                              <>
                                <span>•</span>
                                <MapPin className="h-3 w-3" />
                                <span>
                                  倉庫: {(price as any).shippingLocation}
                                </span>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {formatPrice(price.price, price.currency)}
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded ${getAvailabilityColor(price.availability)}`}
                        >
                          {price.availability.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Libraries Section */}
      {libraryData && (
        <div>
          <button
            onClick={() => setShowLibraries(!showLibraries)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-purple-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">
                  Available Libraries
                </div>
                <div className="text-sm text-gray-600">
                  {libraryData.libraries.length} libraries
                  {libraryData.officialLibrary && (
                    <span className="mx-2">• Official available</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {libraryData.popularLibraries.length > 0 && (
                <span className="text-xs text-gray-500">
                  {libraryData.popularLibraries.length} popular
                </span>
              )}
              {showLibraries ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>

          {showLibraries && (
            <div className="px-4 pb-4 space-y-4">
              {/* Official Library */}
              {libraryData.officialLibrary && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center gap-2 text-blue-800 text-sm font-medium mb-2">
                    <Star className="h-3 w-3" />
                    Official Library
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-blue-900">
                      {libraryData.officialLibrary.name}
                    </div>
                    <div className="text-sm text-blue-700">
                      {libraryData.officialLibrary.repository}
                    </div>
                  </div>
                </div>
              )}

              {/* Popular Libraries */}
              {libraryData.popularLibraries.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Popular Libraries
                  </h4>
                  <div className="space-y-2">
                    {libraryData.popularLibraries.map((lib, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div>
                          <div className="font-medium text-sm">{lib.name}</div>
                          <div className="text-xs text-gray-600">
                            {lib.reason}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatNumber(lib.score)} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Libraries */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  All Libraries ({libraryData.libraries.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {libraryData.libraries.map((lib, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onLibraryClick?.(lib)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {lib.name}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                              {lib.platform}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            v{lib.version} • {formatNumber(lib.downloads)}{' '}
                            downloads
                          </div>
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {lib.repository}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {lib.stars > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Star className="h-3 w-3" />
                              {formatNumber(lib.stars)}
                            </div>
                          )}
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>

                      {/* Compatibility tags */}
                      {lib.compatibility.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {lib.compatibility.slice(0, 3).map((compat, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded"
                            >
                              {compat}
                            </span>
                          ))}
                          {lib.compatibility.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{lib.compatibility.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Data Warning */}
      {!pricingData && !libraryData && (
        <div className="p-4 flex items-center gap-2 text-amber-600 bg-amber-50">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">
            Market data could not be retrieved at this time.
          </span>
        </div>
      )}
    </div>
  );
};

export default MarketDataDisplay;
