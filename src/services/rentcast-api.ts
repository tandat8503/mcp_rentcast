import { config } from "./config.js";
import {
  RentcastProperty,
  RentcastMarket,
  RentcastListing,
  RentcastAVM,
  ApiCallResult,
} from "../types/index.js";

/**
 * Rentcast API Service
 * Handles all API calls to Rentcast with proper error handling and rate limiting
 */
export class RentcastAPIService {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;



  constructor() {
    this.apiKey = config.rentcastApiKey;
    this.baseUrl = config.rentcastBaseUrl;
    this.timeout = config.timeoutSeconds * 1000;

  }

  /**
   * Make a GET request to Rentcast API
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<ApiCallResult> {
    try {




      // Build URL with parameters
      const url = new URL(`${this.baseUrl}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });

      // Make the request
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
          "User-Agent": "Rentcast-MCP-Server/1.0.0",
        },
        signal: AbortSignal.timeout(this.timeout),
      });



      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API Error ${response.status}: ${errorText}`,
          endpoint,
          timestamp: Date.now(),
        };
      }

      const data = await response.json();

      return {
        success: true,
        data,
        endpoint,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        endpoint,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get random properties
   */
  async getRandomProperties(
    params: {
      city?: string;
      state?: string;
      zipCode?: string;
      limit?: number;
    } = {},
  ): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastProperty[]>(
      "/properties/random",
      {
        ...params,
        limit: params.limit || 10, // Default to 10 for free tier optimization
      },
    );
    return result;
  }

  /**
   * Get market statistics
   */
  async getMarketData(
    params: {
      zipCode?: string;
      city?: string;
      state?: string;
      dataType?: string;
    } = {},
  ): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastMarket[]>("/markets", {
      ...params,
      dataType: params.dataType || "All",
    });
    return result;
  }

  /**
   * Get property value estimates (AVM)
   */
  async getPropertyValue(
    params: {
      propertyId?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      propertyType?: string;
      bedrooms?: number;
      bathrooms?: number;
      squareFootage?: number;
    } = {},
  ): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastAVM>("/avm/value", params);
    return result;
  }

  /**
   * Get long-term rent estimates
   */
  async getRentEstimates(
    params: {
      propertyId?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      propertyType?: string;
      bedrooms?: number;
      bathrooms?: number;
      squareFootage?: number;
    } = {},
  ): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastAVM>(
      "/avm/rent/long-term",
      params,
    );
    return result;
  }

  /**
   * Get sale listings
   */
  async getSaleListings(
    params: {
      city?: string;
      state?: string;
      zipCode?: string;
      limit?: number;
    } = {},
  ): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastListing[]>("/listings/sale", {
      ...params,
      limit: params.limit || 15, // Default to 15 for free tier optimization
    });
    return result;
  }

  /**
   * Get rental listings
   */
  async getRentalListings(
    params: {
      city?: string;
      state?: string;
      zipCode?: string;
      limit?: number;
    } = {},
  ): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastListing[]>(
      "/listings/rental/long-term",
      {
        ...params,
        limit: params.limit || 15, // Default to 15 for free tier optimization
      },
    );
    return result;
  }

  /**
   * Search properties with filters
   */
  async searchProperties(
    params: {
      city?: string;
      state?: string;
      zipCode?: string;
      bedrooms?: number;
      bathrooms?: number;
      propertyType?: string;
      priceRange?: string;
      limit?: number;
    } = {},
  ): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastProperty[]>("/properties", {
      ...params,
      limit: params.limit || 15, // Default to 15 for free tier optimization
    });
    return result;
  }

  /**
   * Get detailed sale listing by ID
   */
  async getSaleListing(id: string): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastListing>(
      `/listings/sale/${id}`,
    );
    return result;
  }

  /**
   * Get detailed rental listing by ID
   */
  async getRentalListing(id: string): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastListing>(
      `/listings/rental/long-term/${id}`,
    );
    return result;
  }

  /**
   * Get detailed property record by ID
   */
  async getProperty(id: string): Promise<ApiCallResult> {
    const result = await this.makeRequest<RentcastProperty>(
      `/properties/${id}`,
    );
    return result;
  }






}

// Export singleton instance
export const rentcastAPI = new RentcastAPIService();
