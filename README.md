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
- `list_cards`: Get all saved questions/cards in Metabase
- `list_databases`: View all connected database sources
- `list_collections`: List all collections in Metabase
- `list_tables`: List all tables in a specific database
- `get_table_fields`: Get all fields/columns in a specific table

### Execution Tools
- `execute_card`: Run saved questions and retrieve results with optional parameters
- `execute_query`: Execute custom SQL queries against any connected database

### Card/Question Management
- `create_card`: Create a new question/card with SQL query, optionally adding it to a collection.

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
    "metabase-mcp": {
      "command": "/absolute/path/to/metabase-mcp/build/index.js",
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
    "metabase-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@cheukyin175/metabase-mcp",
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
        "@cheukyin175/metabase-mcp",
        "--config",
        "{\"metabaseUrl\":\"https://your-metabase-instance.com\",\"metabaseApiKey\":\"\",\"metabasePassword\":\"your_password\",\"metabaseUserEmail\":\"your_email@example.com\"}"
      ]
    }
  }
}
```

## Docker Support

### Building the Image

A Docker image is available for containerized deployment:

```bash
# Build the Docker image
docker build -t metabase-mcp .
```

### Running the Container (for Stdio-based Tools)

This server communicates via stdio (standard input/output) by default. This is suitable for AI assistants or tools that can execute a command and interact with its process (e.g., like the Claude Desktop integration described elsewhere).

```bash
# Run the container with environment variables for stdio-based interaction
docker run --rm -i \
           -e METABASE_URL=https://your-metabase.com \
           -e METABASE_API_KEY=your_api_key \
           metabase-mcp
```
*(The `--rm -i` flags are typical for interactive stdio command execution)*

### Production Docker Deployment & Potential HTTP Access

The default server is stdio-based. For use with tools expecting an HTTP endpoint (like n8n's HTTP Request node, custom web UIs, or certain configurations of tools like Cursor), the Metabase MCP server application itself would need to be **adapted to include an HTTP transport** (e.g., to listen for MCP JSON-RPC requests on a port like 4321, which is `EXPOSE`d in the Dockerfile).

Assuming such an HTTP-enabled version of the server, you could run it in production as follows:

1.  Create an environment file (e.g., `metabase.env`) with your credentials:
    ```env
    METABASE_URL=https://your-metabase.com
    METABASE_API_KEY=your_api_key
    LOG_LEVEL=info
    # If using password auth (less recommended for production):
    # METABASE_USER_EMAIL=your_email@example.com
    # METABASE_PASSWORD=your_password
    ```

2.  Run the Docker container:
    ```bash
    docker run -d \
               -p 4321:4321 \
               --env-file ./metabase.env \
               --restart unless-stopped \
               --name metabase-mcp-production \
               metabase-mcp
    ```
    If the server inside the container were serving HTTP on port 4321, it would then be accessible at `http://<docker_host_ip>:4321`.

### Using with n8n (Conceptual - Requires HTTP-enabled MCP Server)

For n8n to interact with this MCP server using its standard HTTP Request node, the MCP server **must be modified to expose an HTTP endpoint** (e.g., on port 4321).

If you have an HTTP-enabled version of the MCP server:

1.  **Network Setup (if n8n is also in Docker):**
    *   Create a shared Docker network:
        ```bash
        docker network create my-automation-net
        ```
    *   Run the (HTTP-enabled) Metabase MCP server container on this network (using an `--env-file` as shown in the production example):
        ```bash
        docker run -d \
                   --network my-automation-net \
                   --name metabase-mcp-http-service \
                   --env-file ./metabase.env \
                   --restart unless-stopped \
                   metabase-mcp 
                   # This container would need to be running an HTTP server on its internal port 4321
        ```
    *   Run your n8n container on the same network:
        ```bash
        docker run -d \
                   --network my-automation-net \
                   --name n8n-instance \
                   -p 5678:5678 \
                   -e GENERIC_TIMEZONE="YOUR_TIMEZONE" \
                   # ... other n8n environment variables ...
                   n8nio/n8n
        ```
    *   In your n8n workflows, use an HTTP Request node to send MCP JSON-RPC requests to `http://metabase-mcp-http-service:4321`.

2.  **If n8n is on the host (or elsewhere with network access):**
    *   Ensure the Metabase MCP server container is run with port mapping (e.g., `-p 4321:4321`) as shown in the "Production Docker Deployment" example.
    *   In n8n, configure the HTTP Request node to call `http://<docker_host_ip>:4321`.

### Troubleshooting Docker Deployment

If you encounter any issues with the Docker build, check the following:

1. Make sure you're using the latest Dockerfile from the repository, as it includes specific optimizations to handle TypeScript compilation correctly.
2. If you make changes to the source code, ensure you rebuild the Docker image.
3. You can check the logs of a running container with:

```bash
docker logs metabase-mcp # Or your container name, e.g., metabase-mcp-production
```

## Cursor Integration

This MCP server communicates via stdio by default. To use it with Cursor, you would typically configure Cursor to execute the server as a command, similar to the Claude Desktop integration. Cursor would need to manage the server process and communicate with it via stdio.

1.  **Ensure your project is built:** `npm run build` (This creates `build/index.js`).
2.  **Get the absolute path** to the executable: `/absolute/path/to/metabase-mcp-server/build/index.js`.
3.  **Configure Cursor (Conceptual JSON):**
    If Cursor uses a JSON configuration file for command-based MCP servers, it might look like this (refer to Cursor's documentation for the exact format and file location):

    ```json
    {
      "mcpServers": { // This top-level key might vary for Cursor
        "metabase-mcp-cursor": {
          "command": "/absolute/path/to/metabase-mcp-server/build/index.js",
          "env": {
            "METABASE_URL": "https://your-metabase-instance.com",
            "METABASE_API_KEY": "your_api_key"
            // Or METABASE_USER_EMAIL & METABASE_PASSWORD
          }
        }
      }
    }
    ```

    **Note:** If Cursor *only* supports MCP servers via an HTTP URL, then the `metabase-mcp-server` application would first need to be modified to include an HTTP transport, as discussed in the "Production Docker Deployment & Potential HTTP Access" section. You would then run it (e.g., in Docker with port mapping) and provide the `http://localhost:4321` (or similar) URL to Cursor.

## Security Considerations

- We recommend using API key authentication for production environments
- Keep your API keys and credentials secure
- Consider using Docker secrets or environment variables instead of hardcoding credentials
- Apply appropriate network security measures to restrict access to your Metabase instance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
