# Metabase MCP Server

A Model Context Protocol server that integrates AI assistants with Metabase analytics platform.

## Overview

This MCP server provides integration with the Metabase API, enabling LLM with MCP capabilites to directly interact with your analytics data, this server acts as a bridge between your analytics platform and conversational AI.

### Key Features

- **Resource Access**: Navigate Metabase resources via intuitive `metabase://` URIs
- **Two Authentication Methods**: Support for both session-based and API key authentication
- **Structured Data Access**: JSON-formatted responses for easy consumption by AI assistants
- **Comprehensive Logging**: Detailed logging for easy debugging and monitoring
- **Error Handling**: Robust error handling with clear error messages

## Available Tools

The server exposes the following tools for AI assistants:

- `list_dashboards`: Retrieve all available dashboards in your Metabase instance
- `list_cards`: Get all saved questions/cards in Metabase
- `list_databases`: View all connected database sources
- `execute_card`: Run saved questions and retrieve results with optional parameters
- `get_dashboard_cards`: Extract all cards from a specific dashboard
- `execute_query`: Execute custom SQL queries against any connected database

## Configuration

The server supports two authentication methods:

### Option 1: Username and Password Authentication

```bash
# Required
METABASE_URL=https://your-metabase-instance.com
METABASE_USER_EMAIL=your_email@example.com
METABASE_PASSWORD=your_password

# Optional
LOG_LEVEL=info # Options: debug, info, warn, error, fatal
```

### Option 2: API Key Authentication (Recommended for Production)

```bash
# Required
METABASE_URL=https://your-metabase-instance.com
METABASE_API_KEY=your_api_key

# Optional
LOG_LEVEL=info # Options: debug, info, warn, error, fatal
```

You can set these environment variables directly or use a `.env` file with [dotenv](https://www.npmjs.com/package/dotenv).

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- An active Metabase instance with appropriate credentials

### Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# For development with auto-rebuild
npm run watch
```

### Claude Desktop Integration

To use with Claude Desktop, add this server configuration:

**MacOS**: Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: Edit `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "metabase-mcp-server": {
      "command": "/absolute/path/to/metabase-mcp-server/build/index.js",
      "env": {
        "METABASE_URL": "https://your-metabase-instance.com",
        "METABASE_USER_EMAIL": "your_email@example.com",
        "METABASE_PASSWORD": "your_password"
        // Or alternatively, use API key authentication
        // "METABASE_API_KEY": "your_api_key"
      }
    }
  }
}
```

Alternatively, you can use the Smithery hosted version via npx with JSON configuration:

#### API Key Authentication:

```json
{
  "mcpServers": {
    "metabase-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@hyeongjun-dev/metabase-mcp-server",
        "--config",
        "{\"metabaseUrl\":\"https://your-metabase-instance.com\",\"metabaseApiKey\":\"your_api_key\",\"metabasePassword\":\"\",\"metabaseUserEmail\":\"\"}"
      ]
    }
  }
}
```

#### Username and Password Authentication:

```json
{
  "mcpServers": {
    "metabase-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@hyeongjun-dev/metabase-mcp-server",
        "--config",
        "{\"metabaseUrl\":\"https://your-metabase-instance.com\",\"metabaseApiKey\":\"\",\"metabasePassword\":\"your_password\",\"metabaseUserEmail\":\"your_email@example.com\"}"
      ]
    }
  }
}
```

## Debugging

Since MCP servers communicate over stdio, use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for debugging:

```bash
npm run inspector
```

The Inspector will provide a browser-based interface for monitoring requests and responses.

## Docker Support

A Docker image is available for containerized deployment:

```bash
# Build the Docker image
docker build -t metabase-mcp-server .

# Run the container with environment variables
docker run -e METABASE_URL=https://your-metabase.com \
           -e METABASE_API_KEY=your_api_key \
           metabase-mcp-server
```

## Security Considerations

- We recommend using API key authentication for production environments
- Keep your API keys and credentials secure
- Consider using Docker secrets or environment variables instead of hardcoding credentials
- Apply appropriate network security measures to restrict access to your Metabase instance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
