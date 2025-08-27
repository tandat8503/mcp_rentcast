import dotenv from "dotenv";
import { ServerConfig } from "../types/index.js";

// Load environment variables
dotenv.config();

/**
 * Configuration service for Rentcast MCP Server
 * Loads all configuration from environment variables with sensible defaults
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: ServerConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public getConfig(): ServerConfig {
    return this.config;
  }

  private loadConfig(): ServerConfig {
    return {
      // Rentcast API Configuration
      rentcastApiKey: this.getRequiredEnv("RENTCAST_API_KEY"),
      rentcastBaseUrl: this.getEnv(
        "RENTCAST_BASE_URL",
        "https://api.rentcast.io/v1",
      ),

      // MCP Server Configuration
      maxApiCalls: this.getNumberEnv("MAX_API_CALLS_PER_SESSION", 40),
      batchSize: this.getNumberEnv("BATCH_SIZE", 5),
      cacheDuration: this.getNumberEnv("CACHE_DURATION_HOURS", 24),
      enableFallbackData: this.getBoolEnv("ENABLE_FALLBACK_DATA", true),
      delayBetweenCalls: this.getNumberEnv("DELAY_BETWEEN_CALLS", 0.1),

      // Security & Rate Limiting
      enableRateLimiting: this.getBoolEnv("ENABLE_RATE_LIMITING", true),
      rateLimitPerMinute: this.getNumberEnv("RATE_LIMIT_PER_MINUTE", 60),
      enableIdempotency: this.getBoolEnv("ENABLE_IDEMPOTENCY", true),

      // Advanced Optimization
      optimizationStrategy: this.getEnv(
        "OPTIMIZATION_STRATEGY",
        "comprehensive_40_calls",
      ),
      enableSmartCaching: this.getBoolEnv("ENABLE_SMART_CACHING", true),
      enableDataMaximization: this.getBoolEnv("ENABLE_DATA_MAXIMIZATION", true),

      // Logging & Development
      logLevel: this.getEnv("LOG_LEVEL", "INFO"),
      debug: this.getBoolEnv("DEBUG", false),
      timeoutSeconds: this.getNumberEnv("TIMEOUT_SECONDS", 30),
    };
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  private getEnv(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      console.warn(
        `Invalid number for ${key}: ${value}, using default: ${defaultValue}`,
      );
      return defaultValue;
    }
    return num;
  }

  private getBoolEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;

    return value.toLowerCase() === "true";
  }

  // Getters for specific config values
  public get rentcastApiKey(): string {
    return this.config.rentcastApiKey;
  }

  public get rentcastBaseUrl(): string {
    return this.config.rentcastBaseUrl;
  }

  public get maxApiCalls(): number {
    return this.config.maxApiCalls;
  }

  public get batchSize(): number {
    return this.config.batchSize;
  }

  public get enableRateLimiting(): boolean {
    return this.config.enableRateLimiting;
  }

  public get rateLimitPerMinute(): number {
    return this.config.rateLimitPerMinute;
  }

  public get enableIdempotency(): boolean {
    return this.config.enableIdempotency;
  }

  public get optimizationStrategy(): string {
    return this.config.optimizationStrategy;
  }

  public get debug(): boolean {
    return this.config.debug;
  }

  public get timeoutSeconds(): number {
    return this.config.timeoutSeconds;
  }
}

// Export singleton instance
export const config = ConfigService.getInstance();
