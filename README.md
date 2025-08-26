# 🏠 Rentcast MCP Server

A Model Context Protocol (MCP) server that provides access to Rentcast Real Estate API data through a standardized interface. This server enables AI assistants and applications to retrieve comprehensive real estate information including property details, market analysis, rent estimates, and property valuations.

## ✨ Features

- **🔍 Property Search**: Search properties with filters (city, state, bedrooms, bathrooms, etc.)
- **🎲 Random Properties**: Get random properties for market analysis
- **📊 Market Analysis**: Comprehensive market statistics and trends
- **💰 Property Valuation**: Automated property value estimates with comparables
- **🏠 Rent Estimates**: Long-term rent estimates with comparable properties
- **🏘️ Sale Listings**: Current properties for sale
- **🏘️ Rental Listings**: Current properties for rent
- **🏠 Property Details**: Detailed property information and parameters

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Rentcast API key ([Get one here](https://rentcast.io/))

### Installation

```bash
# Clone the repository
git clone https://github.com/tandat8503/mcp_rentcast.git
cd mcp_rentcast

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your Rentcast API key
RENTCAST_API_KEY=your_api_key_here

# Build the project
npm run build

# Start the server
npm start
```

### Using with MCP Inspector

```bash
# Start MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js

# Open browser at http://localhost:6274
# Use the provided auth token to access the interface
```

## 🛠️ Available Tools

### 1. **search_properties**
Search for properties with comprehensive information.

**Parameters:**
- `city` (optional): City name (e.g., "Austin", "New York")
- `state` (optional): State abbreviation (e.g., "TX", "CA")
- `zipCode` (optional): ZIP code (e.g., "78705")
- `bedrooms` (optional): Number of bedrooms (1-10)
- `bathrooms` (optional): Number of bathrooms (1-10)
- `propertyType` (optional): Property type (e.g., "Single Family", "Condo")
- `limit` (optional): Maximum results (default: 15, max: 50)

**Example:**
```json
{
  "city": "Austin",
  "state": "TX",
  "bedrooms": 2,
  "limit": 20
}
```

### 2. **get_random_properties**
Get random properties for market analysis.

**Parameters:**
- `city` (optional): City name
- `state` (optional): State abbreviation
- `zipCode` (optional): ZIP code
- `limit` (optional): Number of properties (default: 10, max: 50)

### 3. **analyze_market**
Get comprehensive market statistics and trends.

**Parameters:**
- `zipCode` (optional): ZIP code for analysis
- `city` (optional): City name
- `state` (optional): State abbreviation
- `dataType` (optional): "All", "Sale", or "Rental" (default: "All")

### 4. **get_property_value**
Get automated property value estimates.

**Required (one of):**
- `address`: Full property address
- `latitude` + `longitude`: GPS coordinates
- `propertyId`: Unique property identifier

**Optional:**
- `propertyType`: Property type
- `bedrooms`: Number of bedrooms
- `bathrooms`: Number of bathrooms
- `squareFootage`: Property size in sq ft

**Example:**
```json
{
  "address": "1011 W 23rd St, Austin, TX 78705",
  "propertyType": "Apartment",
  "bedrooms": 1,
  "bathrooms": 1
}
```

### 5. **get_rent_estimates**
Get long-term rent estimates with comparable properties.

**Required (one of):**
- `address`: Full property address
- `latitude` + `longitude`: GPS coordinates
- `propertyId`: Unique property identifier

**Optional:**
- `propertyType`: Property type
- `bedrooms`: Number of bedrooms
- `bathrooms`: Number of bathrooms
- `squareFootage`: Property size in sq ft

### 6. **get_sale_listings**
Get current properties for sale.

**Parameters:**
- `city` (optional): City name
- `state` (optional): State abbreviation
- `zipCode` (optional): ZIP code
- `limit` (optional): Maximum results (default: 15, max: 50)

### 7. **get_rental_listings**
Get current properties for rent.

**Parameters:**
- `city` (optional): City name
- `state` (optional): State abbreviation
- `zipCode` (optional): ZIP code
- `limit` (optional): Maximum results (default: 15, max: 50)

### 8. **get_property_details**
Get detailed property information.

**Parameters:**
- `id` (required): Property or listing ID

### 9. **get_server_status**
Get server status and API usage information.

**Parameters:** None

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RENTCAST_API_KEY` | Your Rentcast API key | - | ✅ |
| `RENTCAST_BASE_URL` | Rentcast API base URL | `https://api.rentcast.io/v1` | ❌ |
| `MAX_API_CALLS_PER_SESSION` | Maximum API calls per session | `40` | ❌ |
| `TIMEOUT_SECONDS` | API call timeout | `30` | ❌ |
| `ENABLE_RATE_LIMITING` | Enable rate limiting | `true` | ❌ |
| `RATE_LIMIT_PER_MINUTE` | Rate limit per minute | `60` | ❌ |
| `DEBUG` | Enable debug mode | `false` | ❌ |
| `LOG_LEVEL` | Log level | `INFO` | ❌ |

### API Limits

- **Free Tier**: 45 API calls per month
- **Default Session Limit**: 40 calls per session
- **Rate Limiting**: 60 calls per minute (configurable)

## 🏗️ Project Structure

```
mcp_rentcast/
├── src/
│   ├── index.ts          # Main MCP server implementation
│   ├── services/
│   │   ├── config.ts     # Configuration service
│   │   └── rentcast-api.ts # Rentcast API client
│   └── types/
│       └── index.ts      # TypeScript type definitions
├── dist/                 # Compiled JavaScript output
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore patterns
└── README.md            # This file
```

## 🚀 Development

### Scripts

```bash
# Build the project
npm run build

# Start in development mode with hot reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Building

```bash
# Development build
npm run build

# The compiled output will be in the `dist/` directory
```

### Debug Mode

The server includes comprehensive console logging for debugging:

- **Input Parameters**: Logs all parameters received by tools
- **API Responses**: Logs API call results and data samples
- **Error Handling**: Detailed error logging with context
- **Performance**: API call counts and rate limiting information

## 🔍 Debugging

### Console Logs

Each tool provides detailed logging:

```bash
🔍 [tool_name] Tool called with params: { ... }
🔍 [tool_name] Built search params: { ... }
🔍 [tool_name] API result: { ... }
🔍 [tool_name] Data sample: { ... }
🔍 [tool_name] Tool completed successfully
```

### Common Issues

1. **Missing API Key**: Ensure `RENTCAST_API_KEY` is set in `.env`
2. **API Limits**: Monitor remaining API calls with `get_server_status`
3. **Rate Limiting**: Wait between API calls if rate limited
4. **Invalid Parameters**: Check parameter validation in console logs

## 📊 API Usage Optimization

### Best Practices

1. **Batch Requests**: Use higher limits when possible to reduce API calls
2. **Caching**: Implement caching for frequently requested data
3. **Parameter Validation**: Provide accurate parameters for better results
4. **Error Handling**: Implement proper error handling for failed requests

### Rate Limiting

- Default: 60 calls per minute
- Configurable via `RATE_LIMIT_PER_MINUTE`
- Automatic delays between calls when enabled

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Rentcast API Documentation](https://docs.rentcast.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)

## 🆘 Support

For issues and questions:

1. Check the console logs for debugging information
2. Verify your API key and configuration
3. Check Rentcast API status and limits
4. Open an issue in the repository

---

**Built with ❤️ for the MCP community**
