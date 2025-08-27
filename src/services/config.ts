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



  public get timeoutSeconds(): number {
    return this.config.timeoutSeconds;
  }
}

// Export singleton instance
export const config = ConfigService.getInstance();
