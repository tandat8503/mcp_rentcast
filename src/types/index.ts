import { z } from "zod";

// ========================================
// 🏠 PROPERTY INTERFACES (Based on actual JSON samples)
// ========================================

/**
 * Base interface for all property types
 */
export interface BaseProperty {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
  lotSize?: number | null;
  yearBuilt?: number | null;
}

/**
 * Property Record (from /properties endpoint)
 * Contains historical and ownership data
 */
export interface PropertyRecord extends BaseProperty {
  assessorID?: string;
  legalDescription?: string;
  subdivision?: string;
  zoning?: string;
  lastSaleDate?: string;
  lastSalePrice?: number;
  hoa?: {
    fee: number;
  };
  features?: Record<string, any>;
  taxAssessments?: Record<string, any>;
  propertyTaxes?: Record<string, any>;
  history?: Record<
    string,
    {
      event: string;
      date?: string;
      price?: number;
    }
  >;
  owner?: {
    names: string[];
    type: string;
    mailingAddress: any;
  };
  ownerOccupied?: boolean;
}

/**
 * Sale Listing (from /listings/sale endpoint)
 * Contains current listing information
 */
export interface SaleListing extends BaseProperty {
  status: string;
  price: number;
  listingType: string;
  listedDate: string;
  removedDate?: string | null;
  createdDate: string;
  lastSeenDate: string;
  daysOnMarket: number;
  mlsName: string;
  mlsNumber: string;
  listingAgent?: {
    name: string;
    phone: string;
    email: string;
    website: string;
  };
  listingOffice?: {
    name: string;
    phone: string;
    email: string;
    website?: string;
  };
  history?: Record<
    string,
    {
      event: string;
      price: number;
      listingType: string;
      listedDate: string;
      removedDate?: string | null;
      daysOnMarket: number;
    }
  >;
}

/**
 * Rental Listing (from /listings/rental endpoint)
 * Contains current rental information
 */
export interface RentalListing extends BaseProperty {
  status: string;
  rent: number; // Monthly rent
  listingType: string;
  listedDate: string;
  removedDate?: string | null;
  createdDate: string;
  lastSeenDate: string;
  daysOnMarket: number;
  mlsName: string;
  mlsNumber: string;
  listingAgent?: {
    name: string;
    phone: string;
    email: string;
    website: string;
  };
  listingOffice?: {
    name: string;
    phone: string;
    email: string;
    website?: string;
  };
  history?: Record<
    string,
    {
      event: string;
      rent: number;
      listingType: string;
      listedDate: string;
      removedDate?: string | null;
      daysOnMarket: number;
    }
  >;
}

/**
 * Union type for all property types
 */
export type RentcastProperty = PropertyRecord | SaleListing | RentalListing;

export interface RentcastMarket {
  zipCode: string;
  city: string;
  state: string;
  medianPrice: number;
  medianRent: number;
  pricePerSqFt: number;
  rentPerSqFt: number;
  daysOnMarket: number;
  inventoryCount: number;
}

export interface RentcastListing {
  id: string;
  propertyId: string;
  address: {
    line1: string;
    city: string;
    state: string;
    zipCode: string;
  };
  price: number;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: string;
  listingType: "sale" | "rental";
  status: string;
  listedDate: string;
  lastSeen: string;
}

export interface RentcastAVM {
  propertyId: string;
  estimatedValue: number;
  confidence: number;
  lastUpdated: string;
  comparables: RentcastProperty[];
}

// ========================================
// 🎯 MCP TOOL SCHEMAS (Following MCP SDK patterns)
// ========================================

export const PropertySearchSchema = z.object({
  city: z.string().optional().describe("City name for property search (e.g., 'Austin', 'New York')"),
  state: z.string().optional().describe("State abbreviation (e.g., 'TX', 'CA', 'NY')"),
  zipCode: z.string().optional().describe("ZIP code for location-based search (e.g., '78705', '90210')"),
  bedrooms: z.number().min(0).max(10).optional().describe("Number of bedrooms (e.g., 1, 2, 3)"),
  bathrooms: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe("Number of bathrooms (e.g., 1, 1.5, 2)"),
  propertyType: z
    .string()
    .optional()
    .describe("Property type (e.g., 'Single Family', 'Condo', 'Townhouse')"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(15)
    .describe(
      "Maximum number of properties to return (default: 15, max: 50 for free tier)",
    ),
});

export const MarketAnalysisSchema = z.object({
  zipCode: z.string().optional().describe("ZIP code for market analysis"),
  city: z.string().optional().describe("City name for market analysis"),
  state: z
    .string()
    .optional()
    .describe("State abbreviation for market analysis"),
  dataType: z
    .enum(["All", "Sale", "Rental"])
    .default("All")
    .describe("Type of market data to analyze"),
});

export const AVMSchema = z.object({
  propertyId: z.string().optional().describe("Property ID for valuation"),
  address: z.string().optional().describe("Property address for valuation"),
  latitude: z.number().optional().describe("Property latitude coordinate"),
  longitude: z.number().optional().describe("Property longitude coordinate"),
  propertyType: z.string().optional().describe("Property type for valuation"),
  bedrooms: z.number().min(0).max(10).optional().describe("Number of bedrooms"),
  bathrooms: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe("Number of bathrooms"),
  squareFootage: z.number().optional().describe("Property square footage"),
});

export const RandomPropertiesSchema = z.object({
  city: z.string().optional().describe("City for random property selection"),
  state: z.string().optional().describe("State for random property selection"),
  zipCode: z
    .string()
    .optional()
    .describe("ZIP code for random property selection"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe(
      "Number of random properties to return (default: 10, max: 50 for free tier)",
    ),
});

export const ListingSearchSchema = z.object({
  city: z.string().optional().describe("City for listing search (e.g., 'Austin', 'New York', 'Los Angeles')"),
  state: z.string().optional().describe("State for listing search (e.g., 'TX', 'NY', 'CA')"),
  zipCode: z.string().optional().describe("ZIP code for listing search (e.g., '78705', '10001', '90210')"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(15)
    .describe(
      "Maximum number of listings to return (default: 15, max: 50 for free tier)",
    ),
});

export const PropertyDetailSchema = z.object({
  id: z.string().describe("Property or listing ID for detailed information"),
});

/**
 * Schema for listing type validation
 */
export const ListingTypeSchema = z.object({
  listingType: z.enum(["sale", "rental"]).describe("Type of listing - must be either 'sale' or 'rental'"),
});

// ========================================
// 📝 ENDPOINT CONFIGURATION
// ========================================

export interface EndpointConfig {
  path: string;
  method: "GET" | "POST";
  description: string;
  requiredParams: string[];
  optionalParams: string[];
  maxDataParams: Record<string, any>;
  responseType: string;
  dataVolume: "high" | "medium" | "low";
}

export const RENTCAST_ENDPOINTS: Record<string, EndpointConfig> = {
  "properties/random": {
    path: "/properties/random",
    method: "GET",
    description:
      "Get random properties with optimized data (10 per call for free tier)",
    requiredParams: [],
    optionalParams: ["city", "state", "zipCode", "limit"],
    maxDataParams: { limit: 50 },
    responseType: "Property[]",
    dataVolume: "medium",
  },
  markets: {
    path: "/markets",
    method: "GET",
    description: "Get market statistics and trends",
    requiredParams: [],
    optionalParams: ["zipCode", "city", "state", "dataType"],
    maxDataParams: { dataType: "All" },
    responseType: "Market[]",
    dataVolume: "medium",
  },
  "avm/value": {
    path: "/avm/value",
    method: "GET",
    description: "Get property value estimates with comparables",
    requiredParams: [],
    optionalParams: ["propertyId", "address", "propertyType"],
    maxDataParams: {},
    responseType: "AVM",
    dataVolume: "medium",
  },
  "avm/rent/long-term": {
    path: "/avm/rent/long-term",
    method: "GET",
    description: "Get long-term rent estimates with comparables",
    requiredParams: [],
    optionalParams: ["propertyId", "address", "propertyType"],
    maxDataParams: {},
    responseType: "AVM",
    dataVolume: "medium",
  },
  "listings/sale": {
    path: "/listings/sale",
    method: "GET",
    description:
      "Get sale listings with optimized data (15 per call for free tier)",
    requiredParams: [],
    optionalParams: ["city", "state", "zipCode", "limit"],
    maxDataParams: { limit: 50 },
    responseType: "Listing[]",
    dataVolume: "medium",
  },
  "listings/rental/long-term": {
    path: "/listings/rental/long-term",
    method: "GET",
    description:
      "Get long-term rental listings with optimized data (15 per call for free tier)",
    requiredParams: [],
    optionalParams: ["city", "state", "zipCode", "limit"],
    maxDataParams: { limit: 50 },
    responseType: "Listing[]",
    dataVolume: "medium",
  },
  properties: {
    path: "/properties",
    method: "GET",
    description: "Search properties with filters (15 per call for free tier)",
    requiredParams: [],
    optionalParams: [
      "city",
      "state",
      "zipCode",
      "bedrooms",
      "bathrooms",
      "propertyType",
      "priceRange",
      "limit",
    ],
    maxDataParams: { limit: 50 },
    responseType: "Property[]",
    dataVolume: "medium",
  },
  "listings/sale/{id}": {
    path: "/listings/sale/{id}",
    method: "GET",
    description: "Get detailed sale listing by ID",
    requiredParams: ["id"],
    optionalParams: [],
    maxDataParams: {},
    responseType: "Listing",
    dataVolume: "low",
  },
  "listings/rental/long-term/{id}": {
    path: "/listings/rental/long-term/{id}",
    method: "GET",
    description: "Get detailed rental listing by ID",
    requiredParams: ["id"],
    optionalParams: [],
    maxDataParams: {},
    responseType: "Listing",
    dataVolume: "low",
  },
  "properties/{id}": {
    path: "/properties/{id}",
    method: "GET",
    description: "Get detailed property record by ID",
    requiredParams: ["id"],
    optionalParams: [],
    maxDataParams: {},
    responseType: "Property",
    dataVolume: "low",
  },
};

// ========================================
// ⚙️ CONFIGURATION TYPES
// ========================================

export interface ServerConfig {
  rentcastApiKey: string;
  rentcastBaseUrl: string;
  timeoutSeconds: number;
}



export interface ApiCallResult {
  success: boolean;
  data?: any;
  error?: string;
  endpoint: string;
  timestamp: number;
}

// ========================================
// 🎨 TYPES READY FOR USE
// ========================================
// All interfaces are automatically exported

// ========================================
// 🏠 RENT ESTIMATE SCHEMA
// ========================================

/**
 * Schema for rent estimate requests
 */
export const RentEstimateSchema = z.object({
  // Required parameters (at least one)
  propertyId: z.string().optional().describe("Unique property identifier from Rentcast database (e.g., '12345')"),
  address: z.string().optional().describe("Full property address (e.g., '1011 W 23rd St, Apt 101, Austin, TX 78705')"),
  latitude: z.number().optional().describe("Property latitude coordinate (e.g., 30.287007)"),
  longitude: z.number().optional().describe("Property longitude coordinate (e.g., -97.748941)"),
  
  // Optional parameters for better accuracy
  propertyType: z.string().optional().describe("Type of property (e.g., 'Apartment', 'House', 'Condo', 'Townhouse')"),
  bedrooms: z.number().optional().describe("Number of bedrooms (e.g., 1, 2, 3)"),
  bathrooms: z.number().optional().describe("Number of bathrooms (e.g., 1, 1.5, 2)"),
  squareFootage: z.number().optional().describe("Property size in square feet (e.g., 450, 1200, 2000)"),
});

/**
 * Rent estimate response interface
 */
export interface RentEstimateResponse {
  rent?: number;
  rentRangeLow?: number;
  rentRangeHigh?: number;
  comparables?: Array<{
    address: string;
    rent: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    propertyType?: string;
    distance?: number;
  }>;
  propertyId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
}
