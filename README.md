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

### Data Access Tools
- `list_dashboards`: Retrieve all available dashboards in your Metabase instance
- `list_cards`: Get all saved questions/cards in Metabase
- `list_databases`: View all connected database sources
- `list_collections`: List all collections in Metabase
- `list_tables`: List all tables in a specific database
- `get_table_fields`: Get all fields/columns in a specific table

### Execution Tools
- `execute_card`: Run saved questions and retrieve results with optional parameters
- `execute_query`: Execute custom SQL queries against any connected database

### Dashboard Management
- `get_dashboard_cards`: Extract all cards from a specific dashboard
- `create_dashboard`: Create a new dashboard with specified name and parameters
- `update_dashboard`: Update an existing dashboard's name, description, or parameters
- `delete_dashboard`: Delete a dashboard
- `add_card_to_dashboard`: Add an existing card to a dashboard with position specifications

### Card/Question Management
- `create_card`: Create a new question/card with SQL query
- `update_card_visualization`: Update visualization settings for a card

### Collection Management
- `create_collection`: Create a new collection to organize dashboards and questions

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

## Deployment with Smithery

To use this MCP server with Claude or other AI assistants, fork this repository and deploy using Smithery:

### Steps to Deploy:

1. Fork this repository to your GitHub account
2. Go to [Smithery](https://smithery.dev) and connect with your GitHub account
3. Deploy the forked repository through Smithery's interface

### Claude Desktop Integration

Configure your Claude Desktop to use the Smithery-hosted version:

**MacOS**: Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: Edit `%APPDATA%/Claude/claude_desktop_config.json`

#### API Key Authentication:

```json
{
  "mcpServers": {
    "metabase-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/cli@latest",
        "run",
        "YOUR_GITHUB_USERNAME/metabase-mcp-server",
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
    "metabase-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/cli@latest",
        "run",
        "YOUR_GITHUB_USERNAME/metabase-mcp-server",
        "--config",
        "{\"metabaseUrl\":\"https://your-metabase-instance.com\",\"metabaseApiKey\":\"\",\"metabasePassword\":\"your_password\",\"metabaseUserEmail\":\"your_email@example.com\"}"
      ]
    }
  }
}
```

## Security Considerations

- recommend using API key authentication for production environments
- Keep your API keys and credentials secure
- Consider using environment variables instead of hardcoding credentials
- Apply appropriate network security measures to restrict access to your Metabase instance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
