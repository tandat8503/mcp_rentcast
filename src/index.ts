#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './services/config.js';
import { rentcastAPI } from './services/rentcast-api.js';
import {
  PropertySearchSchema,
  RandomPropertiesSchema,
  MarketAnalysisSchema,
  AVMSchema,
  ListingSearchSchema,
  PropertyDetailSchema,
  RentEstimateSchema,
  RentEstimateResponse,
  ListingTypeSchema
} from './types/index.js';
import { z } from 'zod';

// ========================================
// 🛠️ SMART HELPER FUNCTION
// ========================================

/**
 * Smart property formatter that handles all Rentcast API data structures
 * Automatically detects property type and formats accordingly
 */
function formatPropertyInfo(prop: any): string {
  const address = prop.formattedAddress || 'Address not available';
  
  // Smart price detection and formatting
  let priceDisplay = 'N/A';
  let priceType = '';
  
  if (prop.price) {
    // Sale listing or rental listing
    if (prop.rent || prop.listingType === 'Rental') {
      // Rental listing - price is monthly rent
      priceDisplay = `$${Number(prop.price).toLocaleString()}/month`;
      priceType = ' (Monthly Rent)';
    } else {
      // Sale listing - price is sale price
      priceDisplay = `$${Number(prop.price).toLocaleString()}`;
      if (prop.status === 'Active') {
        priceType = ' (Active Listing)';
      } else {
        priceType = ' (Listing)';
      }
    }
  } else if (prop.rent) {
    // Rental listing with rent field
    priceDisplay = `$${Number(prop.rent).toLocaleString()}/month`;
    priceType = ' (Monthly Rent)';
  } else if (prop.lastSalePrice) {
    // Property record with last sale price
    priceDisplay = `$${Number(prop.lastSalePrice).toLocaleString()}`;
    priceType = ' (Last Sale)';
  } else if (prop.history && Object.keys(prop.history).length > 0) {
    // Try to get price from history
    const saleDates = Object.keys(prop.history).filter(date => {
      const historyEntry = prop.history[date as keyof typeof prop.history];
      return historyEntry?.event === 'Sale' || historyEntry?.event === 'Sale Listing';
    }).sort().reverse();
    
    if (saleDates.length > 0) {
      const latestSale = prop.history[saleDates[0]!];
      if (latestSale?.price) {
        priceDisplay = `$${Number(latestSale.price).toLocaleString()}`;
        priceType = ` (${saleDates[0]})`;
      } else if (latestSale?.event === 'Sale' || latestSale?.event === 'Sale Listing') {
        priceDisplay = `Sale recorded (${saleDates[0]})`;
        priceType = ' - No price data';
      }
    }
  }
  
  // If still no price data, show property type and year built
  if (priceDisplay === 'N/A') {
    priceDisplay = prop.propertyType || 'Property';
    priceType = prop.yearBuilt ? ` (${prop.yearBuilt})` : '';
  }
  
  // Safe null/undefined checking for all fields
  const beds = prop.bedrooms != null ? `${prop.bedrooms} bed` : 'N/A bed';
  const baths = prop.bathrooms != null ? `${prop.bathrooms} bath` : 'N/A bath';
  const sqft = prop.squareFootage != null ? `${Number(prop.squareFootage).toLocaleString()} sqft` : 'N/A';
  
  // Additional details with safe checking
  const lotSize = prop.lotSize != null ? ` | 🌳 ${Number(prop.lotSize).toLocaleString()} sqft lot` : '';
  const yearBuilt = prop.yearBuilt != null ? ` | 📅 ${prop.yearBuilt} built` : '';
  const lastSaleDate = prop.lastSaleDate ? ` | 🗓️ ${prop.lastSaleDate.split('T')[0]} last sale` : '';
  const status = prop.status ? ` | 📊 ${prop.status}` : '';
  const daysOnMarket = prop.daysOnMarket != null ? ` | ⏱️ ${prop.daysOnMarket} days on market` : '';
  const propertyType = prop.propertyType ? ` | 🏠 ${prop.propertyType}` : '';
  
  // Build comprehensive property info
  let propertyInfo = `📍 ${address}\n💰 ${priceDisplay}${priceType} | 🛏️ ${beds} | 🚿 ${baths} | 📐 ${sqft}`;
  
  // Add optional details
  if (lotSize || yearBuilt || lastSaleDate || status || daysOnMarket || propertyType) {
    propertyInfo += `${lotSize}${yearBuilt}${lastSaleDate}${status}${daysOnMarket}${propertyType}`;
  }
  
  return propertyInfo;
}

/**
 * Format sale market data for market analysis tool
 */
function formatSaleMarketData(saleData: any): string {
  if (!saleData) return '';
  
  let result = `\n🏠 Sales Market:`;
  
  // Current month data
  if (saleData.averagePrice !== undefined) {
    result += `\n💰 Average Price: $${Number(saleData.averagePrice).toLocaleString()}`;
  }
  if (saleData.medianPrice !== undefined) {
    result += `\n📈 Median Price: $${Number(saleData.medianPrice).toLocaleString()}`;
  }
  if (saleData.averagePricePerSquareFoot !== undefined) {
    result += `\n📐 Avg Price/Sqft: $${Number(saleData.averagePricePerSquareFoot).toFixed(2)}`;
  }
  if (saleData.averageDaysOnMarket !== undefined) {
    result += `\n⏱️ Avg Days on Market: ${Number(saleData.averageDaysOnMarket).toFixed(1)}`;
  }
  if (saleData.newListings !== undefined) {
    result += `\n🆕 New Listings: ${saleData.newListings}`;
  }
  if (saleData.totalListings !== undefined) {
    result += `\n📋 Total Listings: ${saleData.totalListings}`;
  }
  
  // Property type breakdown
  if (saleData.dataByPropertyType && saleData.dataByPropertyType.length > 0) {
    result += `\n\n🏠 By Property Type:`;
    saleData.dataByPropertyType.slice(0, 3).forEach((typeData: any) => {
      const avgPrice = typeData.averagePrice ? `$${Number(typeData.averagePrice).toLocaleString()}` : 'N/A';
      result += `\n• ${typeData.propertyType}: ${avgPrice} avg`;
    });
  }
  
  return result;
}

/**
 * Format rental market data for market analysis tool
 */
function formatRentalMarketData(rentalData: any): string {
  if (!rentalData) return '';
  
  let result = `\n\n🏘️ Rental Market:`;
  
  // Current month data
  if (rentalData.averageRent !== undefined) {
    result += `\n💰 Average Rent: $${Number(rentalData.averageRent).toLocaleString()}/month`;
  }
  if (rentalData.medianRent !== undefined) {
    result += `\n📈 Median Rent: $${Number(rentalData.medianRent).toLocaleString()}/month`;
  }
  if (rentalData.averageRentPerSquareFoot !== undefined) {
    result += `\n📐 Avg Rent/Sqft: $${Number(rentalData.averageRentPerSquareFoot).toFixed(2)}`;
  }
  if (rentalData.newListings !== undefined) {
    result += `\n🆕 New Listings: ${rentalData.newListings}`;
  }
  if (rentalData.totalListings !== undefined) {
    result += `\n📋 Total Listings: ${rentalData.totalListings}`;
  }
  
  // Property type breakdown
  if (rentalData.dataByPropertyType && rentalData.dataByPropertyType.length > 0) {
    result += `\n\n🏠 By Property Type:`;
    rentalData.dataByPropertyType.slice(0, 3).forEach((typeData: any) => {
      const avgRent = typeData.averageRent ? `$${Number(typeData.averageRent).toLocaleString()}/month` : 'N/A';
      result += `\n• ${typeData.propertyType}: ${avgRent} avg`;
    });
  }
  
  return result;
}

/**
 * Format comparables data for AVM and rent estimates tools
 */
function formatComparables(comparables: any[], isRental: boolean = false): string {
  if (!comparables || comparables.length === 0) return '';

  let resultText = `\n\n📊 Comparable Properties (${comparables.length}):`;
  
  comparables.slice(0, 3).forEach((comp: any, index: number) => {
    const priceUnit = isRental ? '/month' : '';
    const compPrice = comp.price ? `$${Number(comp.price).toLocaleString()}${priceUnit}` : 'N/A';
    const distance = comp.distance ? `${(comp.distance * 0.621371).toFixed(2)} miles` : 'N/A';
    const correlation = comp.correlation ? `${(comp.correlation * 100).toFixed(1)}% match` : 'N/A';
    
    resultText += `\n${index + 1}. 📍 ${comp.formattedAddress}`;
    resultText += `\n   💰 ${compPrice} | 🛏️ ${comp.bedrooms || 'N/A'} bed | 🚿 ${comp.bathrooms || 'N/A'} bath`;
    resultText += `\n   📐 ${comp.squareFootage ? `${Number(comp.squareFootage).toLocaleString()} sqft` : 'N/A'} | 🌍 ${distance} | 🎯 ${correlation}`;
  });
  
  return resultText;
}

/**
 * Build search parameters for property search tools
 */
function buildPropertySearchParams(params: any, includeLimit: boolean = true): any {
  const searchParams: any = {};
  
  if (includeLimit && params.limit) {
    searchParams.limit = params.limit;
  }
  
  if (params.city) searchParams.city = params.city;
  if (params.state) searchParams.state = params.state;
  if (params.zipCode) searchParams.zipCode = params.zipCode;
  if (params.bedrooms) searchParams.bedrooms = params.bedrooms;
  if (params.bathrooms) searchParams.bathrooms = params.bathrooms;
  if (params.propertyType) searchParams.propertyType = params.propertyType;
  
  return searchParams;
}

/**
 * Build search parameters for AVM and rent estimate tools
 */
function buildAVMSearchParams(params: any): any {
  const searchParams: any = {};
  
  // Prioritize address if provided, otherwise use other parameters
  if (params.address) {
    searchParams.address = params.address;
  } else if (params.latitude && params.longitude) {
    searchParams.latitude = params.latitude;
    searchParams.longitude = params.longitude;
  } else if (params.propertyId) {
    searchParams.propertyId = params.propertyId;
  }
  
  // Add additional parameters if available (these improve accuracy)
  if (params.propertyType) searchParams.propertyType = params.propertyType;
  if (params.bedrooms !== undefined && params.bedrooms !== null) searchParams.bedrooms = params.bedrooms;
  if (params.bathrooms !== undefined && params.bathrooms !== null) searchParams.bathrooms = params.bathrooms;
  if (params.squareFootage !== undefined && params.squareFootage !== null) searchParams.squareFootage = params.squareFootage;
  
  // Debug logging - removed for MCP compatibility
  
  return searchParams;
}

/**
 * Create standardized error response
 */
function createErrorResponse(message: string, error?: any): any {
  const errorText = error ? `${message}: ${error}` : message;
  return {
    content: [{
      type: "text",
      text: errorText
    }]
  };
}

/**
 * Create standardized success response
 */
function createSuccessResponse(text: string): any {
  return {
    content: [{
      type: "text",
      text: text
    }]
  };
}

/**
 * Extract property parameters for estimation tools
 */
function extractPropertyParams(property: any): string {
  return `📍 Address: ${property.formattedAddress || 'N/A'}\n` +
    `🌍 Latitude: ${property.latitude || 'N/A'}\n` +
    `🌍 Longitude: ${property.longitude || 'N/A'}\n` +
    `🏠 Property Type: ${property.propertyType || 'N/A'}\n` +
    `🛏️ Bedrooms: ${property.bedrooms || 'N/A'}\n` +
    `🚿 Bathrooms: ${property.bathrooms || 'N/A'}\n` +
    `📐 Square Footage: ${property.squareFootage || 'N/A'}`;
}

/**
 * Create property value estimation parameters display
 */
function createPropertyValueParams(property: any, currentPrice?: number): string {
  const baseParams = extractPropertyParams(property);
  const priceInfo = currentPrice ? `\n💰 Current Price: $${Number(currentPrice).toLocaleString()}` : '';
  
  return `\n\n💡 **Property Value Estimation Parameters (Copy to get_property_value tool):**\n` +
    `${baseParams}${priceInfo}\n\n` +
    `💡 **Copy the Address, Latitude, Longitude, Property Type, Bedrooms, Bathrooms, and Square Footage values above to the get_property_value tool fields!**`;
}

/**
 * Create rent estimation parameters display
 */
function createRentEstimationParams(property: any, currentRent?: number): string {
  const baseParams = extractPropertyParams(property);
  const rentInfo = currentRent ? `\n💰 Current Rent: $${Number(currentRent).toLocaleString()}/month` : '';
  
  return `\n\n💡 **Rent Estimation Parameters (Copy to get_rent_estimates tool):**\n` +
    `${baseParams}${rentInfo}\n\n` +
    `💡 **Copy the Address, Latitude, Longitude, Property Type, Bedrooms, Bathrooms, and Square Footage values above to the get_rent_estimates tool fields!**`;
}

// ========================================
// 🚀 MCP SERVER SETUP
// ========================================

const server = new McpServer({
  name: "rentcast-mcp",
  version: "1.0.0"
});

// ========================================
// 🛠️ MCP TOOLS (Rentcast API Endpoints)
// ========================================

// Tool 1: Search Properties
server.tool(
  "search_properties",
  "Search for properties with basic property information (default: 15, max: 50 for free tier) including city, state, bedrooms, bathrooms, square footage, lot size, and year built. Note: Price data may not be available for all properties.",
  PropertySearchSchema.shape,
  async (params) => {
    try {
      console.error('🔍 [search_properties] Tool called with params:', JSON.stringify(params, null, 2));
      
      const searchParams = buildPropertySearchParams(params);
      console.error('🔍 [search_properties] Built search params:', JSON.stringify(searchParams, null, 2));
      
      const result = await rentcastAPI.searchProperties(searchParams);
      console.error('🔍 [search_properties] API result:', JSON.stringify({
        success: result.success,
        error: result.error,
        dataLength: result.data ? (Array.isArray(result.data) ? result.data.length : 'not array') : 'no data',
        callsRemaining: result.callsRemaining
      }, null, 2));

      if (!result.success) {
        return createErrorResponse("Error searching properties", result.error);
      }

      const properties = result.data as any[];
      console.error('🔍 [search_properties] First property sample:', JSON.stringify(properties[0], null, 2));
      
      const summary = `Found ${properties.length} properties`;
      
      // Process each property individually based on actual API structure
      const propertyDetails = properties.slice(0, 10).map(prop => {
        return formatPropertyInfo(prop);
      }).join('\n\n');

      const resultText = `${summary}\n\n${propertyDetails}${properties.length > 10 ? '\n\n... and more properties available' : ''}`;
      console.error('🔍 [search_properties] Tool completed successfully');
      return createSuccessResponse(resultText);

    } catch (error) {
      console.error('❌ [search_properties] Tool error:', error);
      return createErrorResponse("Failed to search properties", error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Tool 2: Get Random Properties
server.tool(
  "get_random_properties",
  "Get random properties with comprehensive info (default: 10, max: 50 for free tier) for market analysis including price history, lot size, and year built",
  RandomPropertiesSchema.shape,
  async (params) => {
    try {
      console.error('🎲 [get_random_properties] Tool called with params:', JSON.stringify(params, null, 2));
      
      const searchParams = buildPropertySearchParams(params);
      console.error('🎲 [get_random_properties] Built search params:', JSON.stringify(searchParams, null, 2));
      
      const result = await rentcastAPI.getRandomProperties(searchParams);
      console.error('🎲 [get_random_properties] API result:', JSON.stringify({
        success: result.success,
        error: result.error,
        dataLength: result.data ? (Array.isArray(result.data) ? result.data.length : 'not array') : 'no data',
        callsRemaining: result.callsRemaining
      }, null, 2));

      if (!result.success) {
        return createErrorResponse("Error getting random properties", result.error);
      }

      const properties = result.data as any[];
      console.error('🎲 [get_random_properties] First property sample:', JSON.stringify(properties[0], null, 2));
      
      const summary = `Retrieved ${properties.length} random properties`;
      
      // Process each property individually
      const sampleProperties = properties.slice(0, 5).map(prop => {
        
        return formatPropertyInfo(prop);
      }).join('\n\n');

      const resultText = `${summary}\n\nSample Properties:\n\n${sampleProperties}${properties.length > 5 ? '\n\n... and more properties available' : ''}`;
      console.error('🎲 [get_random_properties] Tool completed successfully');
      return createSuccessResponse(resultText);

    } catch (error) {
      console.error('❌ [get_random_properties] Tool error:', error);
      return createErrorResponse("Failed to get random properties", error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Tool 3: Market Analysis
server.tool(
  "analyze_market",
  "Get comprehensive market statistics and trends for specific locations",
  MarketAnalysisSchema.shape,
  async (params) => {
    try {
      console.error('📊 [analyze_market] Tool called with params:', JSON.stringify(params, null, 2));
      
      const searchParams: any = { dataType: params.dataType };
      if (params.zipCode) searchParams.zipCode = params.zipCode;
      if (params.city) searchParams.city = params.city;
      if (params.state) searchParams.state = params.state;
      
      console.error('📊 [analyze_market] Built search params:', JSON.stringify(searchParams, null, 2));

      const result = await rentcastAPI.getMarketData(searchParams);
      console.error('📊 [analyze_market] API result:', JSON.stringify({
        success: result.success,
        error: result.error,
        dataLength: result.data ? (Array.isArray(result.data) ? result.data.length : 'not array') : 'no data',
        callsRemaining: result.callsRemaining
      }, null, 2));

      if (!result.success) {
        return createErrorResponse("Error analyzing market", result.error);
      }

      // Simplified market data handling - focus on the structure we know API returns
      const market = Array.isArray(result.data) ? result.data[0] : result.data;
      console.error('📊 [analyze_market] Market data sample:', JSON.stringify(market, null, 2));

      if (!market || (!market.saleData && !market.rentalData)) {
        return createErrorResponse("No market data found for the specified location");
      }
      
      let resultText = `📊 Market Statistics for ${market.zipCode ? `ZIP: ${market.zipCode}` : (params.city ? `${params.city}, ${params.state}` : 'Location')}\n`;
      
      // Add location info
      if (market.zipCode) {
        resultText += `\n📍 Location: ZIP ${market.zipCode}`;
      }
      if (market.city && market.state) {
        resultText += `\n🏙️ ${market.city}, ${market.state}`;
      }
      
      // Format market data
      if (market.saleData) {
        resultText += formatSaleMarketData(market.saleData);
      }
      
      if (market.rentalData) {
        resultText += formatRentalMarketData(market.rentalData);
      }
      
      console.error('📊 [analyze_market] Tool completed successfully');
      return createSuccessResponse(resultText);

    } catch (error) {
      console.error('❌ [analyze_market] Tool error:', error);
      return createErrorResponse("Failed to analyze market", error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Tool 4: Property Valuation (AVM)
server.tool(
  "get_property_value",
  "Get automated property value estimates with comparable properties",
  AVMSchema.shape,
  async (params: z.infer<typeof AVMSchema>) => {
    try {
      console.error('💰 [get_property_value] Tool called with params:', JSON.stringify(params, null, 2));
      
      const searchParams = buildAVMSearchParams(params);
      console.error('💰 [get_property_value] Built search params:', JSON.stringify(searchParams, null, 2));

      // Additional validation to ensure we have required parameters
      if (!searchParams.propertyId && !searchParams.address && (!searchParams.latitude || !searchParams.longitude)) {
        return createErrorResponse(
          "❌ **Missing Required Parameters for Property Valuation**\n\n" +
          "💡 **You must provide ONE of the following options:**\n\n" +
          "**Option 1: Property Address**\n" +
          "• `address`: Full property address (e.g., '1011 W 23rd St, Apt 101, Austin, TX 78705')\n\n" +
          "**Option 2: GPS Coordinates**\n" +
          "• `latitude`: Property latitude (e.g., 30.287007)\n" +
          "• `longitude`: Property longitude (e.g., -97.748941)\n\n" +
          "**Option 3: Property ID**\n" +
          "• `propertyId`: Unique identifier from Rentcast database\n\n" +
          "🔍 **Optional Parameters (improve accuracy):**\n" +
          "• `propertyType`: Apartment, House, Condo, etc.\n" +
          "• `bedrooms`: Number of bedrooms\n" +
          "• `bathrooms`: Number of bathrooms\n" +
          "• `squareFootage`: Property size in sq ft"
        );
      }

      const result = await rentcastAPI.getPropertyValue(searchParams);
      console.error('💰 [get_property_value] API result:', JSON.stringify({
        success: result.success,
        error: result.error,
        dataLength: result.data ? 'has data' : 'no data',
        callsRemaining: result.callsRemaining
      }, null, 2));

      if (!result.success) {
        return createErrorResponse("Error getting property value", result.error);
      }

      const avm = result.data as any;
      if (!avm) {
        return createErrorResponse("No property value data found");
      }
      
      console.error('💰 [get_property_value] AVM data sample:', JSON.stringify(avm, null, 2));

      let resultText = `💰 Estimated Value: ${avm.price ? `$${Number(avm.price).toLocaleString()}` : 'N/A'}`;
      const range = avm.priceRangeLow && avm.priceRangeHigh 
        ? ` (Range: $${Number(avm.priceRangeLow).toLocaleString()} - $${Number(avm.priceRangeHigh).toLocaleString()})`
        : '';
      resultText += `${range}`;
      
      if (avm.comparables && avm.comparables.length > 0) {
        resultText += formatComparables(avm.comparables);
      }
      
      console.error('💰 [get_property_value] Tool completed successfully');
      return createSuccessResponse(resultText);

    } catch (error) {
      console.error('❌ [get_property_value] Tool error:', error);
      return createErrorResponse("Failed to get property value", error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Tool 5: Rent Estimates
server.tool(
  "get_rent_estimates",
  "Get long-term rent estimates with comparable rental properties. This tool helps you estimate monthly rental prices for properties based on location, property characteristics, and market data.",
  RentEstimateSchema.shape,
  async (params: z.infer<typeof RentEstimateSchema>) => {
    try {
      console.error('🏠 [get_rent_estimates] Tool called with params:', JSON.stringify(params, null, 2));
      
      // Validate parameters using Zod schema
      const validatedParams = RentEstimateSchema.parse(params);
      console.error('🏠 [get_rent_estimates] Validated params:', JSON.stringify(validatedParams, null, 2));
      
      // Build search parameters for rent estimates
      const searchParams: Record<string, any> = {};
      
      if (validatedParams.propertyId) searchParams.propertyId = validatedParams.propertyId;
      if (validatedParams.address) searchParams.address = validatedParams.address;
      if (validatedParams.latitude) searchParams.latitude = validatedParams.latitude;
      if (validatedParams.longitude) searchParams.longitude = validatedParams.longitude;
      if (validatedParams.propertyType) searchParams.propertyType = validatedParams.propertyType;
      if (validatedParams.bedrooms) searchParams.bedrooms = validatedParams.bedrooms;
      if (validatedParams.bathrooms) searchParams.bathrooms = validatedParams.bathrooms;
      if (validatedParams.squareFootage) searchParams.squareFootage = validatedParams.squareFootage;
      
      console.error('🏠 [get_rent_estimates] Built search params:', JSON.stringify(searchParams, null, 2));

      // Additional validation to ensure we have required parameters
      if (!searchParams.propertyId && !searchParams.address && (!searchParams.latitude || !searchParams.longitude)) {
        return createErrorResponse(
          "❌ **Missing Required Parameters for Rent Estimates**\n\n" +
          "💡 **You must provide ONE of the following options:**\n\n" +
          "**Option 1: Property Address**\n" +
          "• `address`: Full property address (e.g., '1011 W 23rd St, Apt 101, Austin, TX 78705')\n\n" +
          "**Option 2: GPS Coordinates**\n" +
          "• `latitude`: Property latitude (e.g., 30.287007)\n" +
          "• `longitude`: Property longitude (e.g., -97.748941)\n\n" +
          "**Option 3: Property ID**\n" +
          "• `propertyId`: Unique identifier from Rentcast database\n\n" +
          "🔍 **Optional Parameters (improve accuracy):**\n" +
          "• `propertyType`: Apartment, House, Condo, etc.\n" +
          "• `bedrooms`: Number of bedrooms\n" +
          "• `bathrooms`: Number of bathrooms\n" +
          "• `squareFootage`: Property size in sq ft\n\n" +
          "📋 **Example Usage:**\n" +
          "```json\n" +
          "{\n" +
          '  "address": "1011 W 23rd St, Apt 101, Austin, TX 78705",\n' +
          '  "propertyType": "Apartment",\n' +
          '  "bedrooms": 1,\n' +
          '  "bathrooms": 1,\n' +
          '  "squareFootage": 450\n' +
          "}\n" +
          "```"
        );
      }

      const result = await rentcastAPI.getRentEstimates(searchParams);
      console.error('🏠 [get_rent_estimates] API result:', JSON.stringify({
        success: result.success,
        error: result.error,
        dataLength: result.data ? 'has data' : 'no data',
        callsRemaining: result.callsRemaining
      }, null, 2));

      if (!result.success) {
        return createErrorResponse("Error getting rent estimates", result.error);
      }

      const rentData = result.data as RentEstimateResponse;
      if (!rentData) {
        return createErrorResponse("No rent estimate data found");
      }
      
      console.error('🏠 [get_rent_estimates] Rent data sample:', JSON.stringify(rentData, null, 2));

      // Format the response
      let resultText = `🏠 **Rent Estimate Results**\n\n`;
      
      // Add usage tips
      resultText += `💡 **Tool Usage Tips:**\n`;
      resultText += `• Use this tool to estimate monthly rental prices for properties\n`;
      resultText += `• Provide more details (bedrooms, bathrooms, square footage) for better accuracy\n`;
      resultText += `• Results include comparable properties for market analysis\n\n`;
      
      // Property identification
      if (rentData.address) {
        resultText += `📍 **Property:** ${rentData.address}\n`;
      }
      if (rentData.propertyType) {
        resultText += `🏠 **Type:** ${rentData.propertyType}\n`;
      }
      if (rentData.bedrooms !== undefined) {
        resultText += `🛏️ **Bedrooms:** ${rentData.bedrooms}\n`;
      }
      if (rentData.bathrooms !== undefined) {
        resultText += `🚿 **Bathrooms:** ${rentData.bathrooms}\n`;
      }
      if (rentData.squareFootage) {
        resultText += `📐 **Square Footage:** ${rentData.squareFootage.toLocaleString()} sqft\n`;
      }
      
      resultText += `\n💰 **Estimated Monthly Rent:** `;
      if (rentData.rent) {
        resultText += `$${Number(rentData.rent).toLocaleString()}/month`;
        
        // Add rent range if available
        if (rentData.rentRangeLow && rentData.rentRangeHigh) {
          resultText += `\n📊 **Rent Range:** $${Number(rentData.rentRangeLow).toLocaleString()} - $${Number(rentData.rentRangeHigh).toLocaleString()}/month`;
        }
      } else {
        resultText += `N/A`;
      }
      
      // Add comparables if available
      if (rentData.comparables && rentData.comparables.length > 0) {
        resultText += `\n\n🏘️ **Comparable Properties:**\n`;
        rentData.comparables.slice(0, 5).forEach((comp, index) => {
          resultText += `\n${index + 1}. **${comp.address}**\n`;
          resultText += `   💰 Rent: $${Number(comp.rent).toLocaleString()}/month`;
          if (comp.bedrooms !== undefined) resultText += ` | 🛏️ ${comp.bedrooms} bed`;
          if (comp.bathrooms !== undefined) resultText += ` | 🚿 ${comp.bathrooms} bath`;
          if (comp.squareFootage) resultText += ` | 📐 ${comp.squareFootage.toLocaleString()} sqft`;
          if (comp.distance) resultText += ` | 📍 ${comp.distance.toFixed(1)} miles away`;
        });
      }
      
      // Add helpful footer
      resultText += `\n\n🔍 **Need More Data?**\n`;
      resultText += `• Use \`get_property_details\` to get comprehensive property information\n`;
      resultText += `• Use \`get_rental_listings\` to see actual rental listings in the area\n`;
      resultText += `• Use \`analyze_market\` to understand rental market trends\n\n`;
      resultText += `📊 **API Usage:** This request used 1 of your ${config.maxApiCalls} available API calls.`;
      
      console.error('🏠 [get_rent_estimates] Tool completed successfully');
      return createSuccessResponse(resultText);

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorDetails = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('❌ [get_rent_estimates] Validation error:', errorDetails);
        return createErrorResponse(`Invalid parameters: ${errorDetails}`);
      }
      console.error('❌ [get_rent_estimates] Tool error:', error);
      return createErrorResponse("Failed to get rent estimates", error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Tool 6: Sale Listings
server.tool(
  "get_sale_listings",
  "Get sale listings with comprehensive property information. This tool searches for properties currently for sale.",
  ListingSearchSchema.shape,
  async (params) => {
    try {
      console.error('🏠 [get_sale_listings] Tool called with params:', JSON.stringify(params, null, 2));
      
      const searchParams = buildPropertySearchParams(params);
      console.error('🏠 [get_sale_listings] Built search params:', JSON.stringify(searchParams, null, 2));

      const result = await rentcastAPI.getSaleListings(searchParams);
      console.error('🏠 [get_sale_listings] API result:', JSON.stringify({
        success: result.success,
        error: result.error,
        dataLength: result.data ? (Array.isArray(result.data) ? result.data.length : 'not array') : 'no data',
        callsRemaining: result.callsRemaining
      }, null, 2));

      if (!result.success) {
        return createErrorResponse("Error getting sale listings", result.error);
      }

      const listings = result.data as any[];
      console.error('🏠 [get_sale_listings] First listing sample:', JSON.stringify(listings[0], null, 2));
      
      const summary = `Found ${listings.length} sale listings`;
      
      const listingDetails = listings.slice(0, 8).map(listing => {
        
        // Use actual Rentcast API data structure
        const propertyInfo = formatPropertyInfo(listing);
        
        // Add property value estimation suggestion with copy-paste ready parameters
        const valueEstimationInfo = createPropertyValueParams(listing, listing.price);
        const rentEstimationInfo = createRentEstimationParams(listing);
        
        return propertyInfo + valueEstimationInfo + rentEstimationInfo;
      }).join('\n\n');

      const resultText = `${summary}\n\n${listingDetails}${listings.length > 8 ? '\n\n... and more listings available' : ''}`;
      console.error('🏠 [get_sale_listings] Tool completed successfully');
      return createSuccessResponse(resultText);

    } catch (error) {
      console.error('❌ [get_sale_listings] Tool error:', error);
      return createErrorResponse("Failed to get sale listings", error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Tool 7: Property Details (Enhanced)
server.tool(
  "get_property_details",
  "Get detailed property information and prepare parameters for property value estimation",
  PropertyDetailSchema.shape,
  async (params) => {
    try {
      console.error('🏠 [get_property_details] Tool called with params:', JSON.stringify(params, null, 2));
      
      // This tool helps prepare property data for other tools
      const result = await rentcastAPI.getProperty(params.id);
      console.error('🏠 [get_property_details] API result:', JSON.stringify({
        success: result.success,
        error: result.error,
        dataLength: result.data ? 'has data' : 'no data',
        callsRemaining: result.callsRemaining
      }, null, 2));

      if (!result.success) {
        return createErrorResponse("Error getting property details", result.error);
      }

      const property = result.data as any;
      if (!property) {
        return createErrorResponse("No property details found");
      }
      
      console.error('🏠 [get_property_details] Property data sample:', JSON.stringify(property, null, 2));

      // Format property details
      const propertyInfo = formatPropertyInfo(property);
      
      // Prepare parameters for property value estimation
      const valueEstimationParams = createPropertyValueParams(property);
      const rentEstimationParams = createRentEstimationParams(property);
      
      const additionalInfo = `\n\n💡 **Copy these values to the get_property_value tool to get an automated valuation estimate!**\n\n` +
        `🏠 **Rent Estimation Parameters:**\n` +
        `${extractPropertyParams(property)}\n\n` +
        `💡 **Copy these values to the get_rent_estimates tool to get rent estimates!**`;

      const resultText = propertyInfo + valueEstimationParams + additionalInfo;
      console.error('🏠 [get_property_details] Tool completed successfully');
      return createSuccessResponse(resultText);

    } catch (error) {
      console.error('❌ [get_property_details] Tool error:', error);
      return createErrorResponse("Failed to get property details", error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Tool 8: Rental Listings
server.tool(
  "get_rental_listings",
  "Get rental listings with comprehensive property information. This tool searches for properties currently for rent.",
  ListingSearchSchema.shape,
  async (params) => {
    try {
      console.error('🏘️ [get_rental_listings] Tool called with params:', JSON.stringify(params, null, 2));
      
      const searchParams = buildPropertySearchParams(params);
      console.error('🏘️ [get_rental_listings] Built search params:', JSON.stringify(searchParams, null, 2));

      const result = await rentcastAPI.getRentalListings(searchParams);
      console.error('🏘️ [get_rental_listings] API result:', JSON.stringify({
        success: result.success,
        error: result.error,
        dataLength: result.data ? (Array.isArray(result.data) ? result.data.length : 'not array') : 'no data',
        callsRemaining: result.callsRemaining
      }, null, 2));

      if (!result.success) {
        return createErrorResponse("Error getting rental listings", result.error);
      }

      const listings = result.data as any[];
      console.error('🏘️ [get_rental_listings] First listing sample:', JSON.stringify(listings[0], null, 2));
      
      const summary = `Found ${listings.length} rental listings`;
      
      const listingDetails = listings.slice(0, 8).map(listing => {
        
        // Use actual Rentcast API data structure
        const propertyInfo = formatPropertyInfo(listing);
        
        // Add rent estimation suggestion with copy-paste ready parameters
        const rentEstimationInfo = createRentEstimationParams(listing, listing.price);
        
        return propertyInfo + rentEstimationInfo;
      }).join('\n\n');

      const resultText = `${summary}\n\n${listingDetails}${listings.length > 8 ? '\n\n... and more listings available' : ''}`;
      console.error('🏘️ [get_rental_listings] Tool completed successfully');
      return createSuccessResponse(resultText);

    } catch (error) {
      console.error('❌ [get_rental_listings] Tool error:', error);
      return createErrorResponse("Failed to get rental listings", error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Tool 8: Property Details (Enhanced - already defined above)
// This tool was moved to Tool 7 above for better organization

// Tool 8: Server Status
server.tool(
  "get_server_status",
  "Get current server status including remaining API calls and rate limiting information",
  {},
  async () => {
    try {
      const status = rentcastAPI.getStatus();
      
      const statusInfo = `📊 Server Status

🔢 API Calls Remaining: ${status.callsRemaining}/${status.maxCalls} (Free Tier: 45 calls)
💰 Usage: ${((status.maxCalls - status.callsRemaining) / status.maxCalls * 100).toFixed(1)}% consumed
⏱️ Last Call Time: ${status.lastCallTime ? new Date(status.lastCallTime).toLocaleString() : 'Never'}
🚦 Rate Limiting: ${status.rateLimitEnabled ? 'Enabled' : 'Disabled'}
⚡ Rate Limit: ${status.rateLimitPerMinute} calls per minute
🕐 Current Time: ${new Date().toLocaleString()}

💡 Free Tier Optimization:
• Random Properties: Default 10, Max 50
• Search Properties: Default 15, Max 50  
• Sale/Rental Listings: Default 15, Max 50
• Market Analysis: 1 call
• Property Valuation: 1 call`;

      return createSuccessResponse(statusInfo);

    } catch (error) {
      return createErrorResponse("Failed to get server status", error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// ========================================
// 🚀 START SERVER
// ========================================

async function main() {
  try {
    console.error('🚀 Starting Rentcast MCP Server...');
    console.error(`📊 API Calls Limit: ${config.maxApiCalls}`);
    console.error(`🔑 API Key: ${config.rentcastApiKey.substring(0, 8)}...`);
    console.error(`🌐 Base URL: ${config.rentcastBaseUrl}`);
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('✅ Rentcast MCP Server started successfully!');
    console.error('🛠️ Available tools: search_properties, get_random_properties, analyze_market, get_property_value, get_rent_estimates, get_sale_listings, get_rental_listings, get_property_details, get_server_status');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.error('\n🛑 Shutting down Rentcast MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n🛑 Shutting down Rentcast MCP Server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
