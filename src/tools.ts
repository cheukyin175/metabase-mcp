import { z } from "zod";

// Custom error enum
export enum ErrorCode {
  InternalError = "internal_error",
  InvalidRequest = "invalid_request",
  InvalidParams = "invalid_params",
  MethodNotFound = "method_not_found"
}

// Custom error class
export class McpError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "McpError";
  }
}

// API error type definition
interface ApiError {
  status?: number;
  message?: string;
  data?: { message?: string };
}

// Logger level enum
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// Authentication method enum
export enum AuthMethod {
  SESSION = 'session',
  API_KEY = 'api_key'
}

// Define request schema for tool listing
export const ListToolsRequestSchema = z.object({
  method: z.literal("tools/list")
});

// Tool handler interface
export interface ToolHandler {
  setupToolHandlers(): void;
}

// Tool definitions
export const TOOL_DEFINITIONS = [
  {
    name: "list_dashboards",
    description: "List all dashboards in Metabase",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "number",
          description: "Optional filter by collection ID"
        },
        archived: {
          type: "boolean",
          description: "Whether to include archived dashboards"
        }
      }
    }
  },
  {
    name: "list_cards",
    description: "List all questions/cards in Metabase",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "number",
          description: "Optional filter by collection ID"
        },
        model_id: {
          type: "number",
          description: "Filter by model ID"
        },
        archived: {
          type: "boolean",
          description: "Whether to include archived cards"
        }
      }
    }
  },
  {
    name: "list_databases",
    description: "List all databases in Metabase",
    inputSchema: {
      type: "object",
      properties: {
        include_tables: {
          type: "boolean",
          description: "Whether to include tables in the response"
        },
        include_cards: {
          type: "boolean",
          description: "Whether to include saved questions/cards in the response"
        }
      }
    }
  },
  {
    name: "execute_card",
    description: "Execute a Metabase question/card and get results",
    inputSchema: {
      type: "object",
      properties: {
        card_id: {
          type: "number",
          description: "ID of the card/question to execute"
        },
        parameters: {
          type: "object",
          description: "Optional parameters for the query"
        },
        ignore_cache: {
          type: "boolean",
          description: "Whether to ignore cached results"
        },
        dashboard_id: {
          type: "number",
          description: "Optional dashboard context"
        }
      },
      required: ["card_id"]
    }
  },
  {
    name: "get_dashboard_cards",
    description: "Get all cards in a dashboard",
    inputSchema: {
      type: "object",
      properties: {
        dashboard_id: {
          type: "number",
          description: "ID of the dashboard"
        }
      },
      required: ["dashboard_id"]
    }
  },
  {
    name: "execute_query",
    description: "Execute a SQL query against a Metabase database",
    inputSchema: {
      type: "object",
      properties: {
        database_id: {
          type: "number",
          description: "ID of the database to query"
        },
        query: {
          type: "string",
          description: "SQL query to execute"
        },
        native_parameters: {
          type: "array",
          description: "Optional parameters for the query",
          items: {
            type: "object"
          }
        },
        max_rows: {
          type: "number",
          description: "Maximum number of rows to return"
        },
        max_results_display_rows: {
          type: "number",
          description: "Maximum number of rows to display in the UI"
        }
      },
      required: ["database_id", "query"]
    }
  },
  {
    name: "create_card",
    description: "Create a new question/card in Metabase",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the card"
        },
        database_id: {
          type: "number",
          description: "ID of the database to query"
        },
        query: {
          type: "string",
          description: "SQL query for the card"
        },
        description: {
          type: "string",
          description: "Description of the card"
        },
        visualization_settings: {
          type: "object",
          description: "Visualization settings for the card"
        },
        collection: {
          type: "number",
          description: "ID of the collection to put the card in (optional)"
        },
        display: {
          type: "string",
          description: "Display type (e.g., 'table', 'line', 'bar', 'pie')"
        },
        enable_embedding: {
          type: "boolean",
          description: "Whether to enable embedding for this card"
        },
        is_write: {
          type: "boolean",
          description: "Whether this is a write query"
        }
      },
      required: ["name", "database_id", "query"]
    }
  },
  {
    name: "update_card_visualization",
    description: "Update visualization settings for a card",
    inputSchema: {
      type: "object",
      properties: {
        card_id: {
          type: "number",
          description: "ID of the card to update"
        },
        visualization_settings: {
          type: "object",
          description: "New visualization settings"
        },
        collection_id: {
          type: "number",
          description: "ID of the collection to put the card in (optional)"
        }
      },
      required: ["card_id", "visualization_settings"]
    }
  },
  {
    name: "add_card_to_dashboard",
    description: "Add a card to a dashboard",
    inputSchema: {
      type: "object",
      properties: {
        dashboard_id: {
          type: "number",
          description: "ID of the dashboard"
        },
        card_id: {
          type: "number",
          description: "ID of the card to add"
        },
        row: {
          type: "number",
          description: "Row position in the dashboard grid"
        },
        col: {
          type: "number",
          description: "Column position in the dashboard grid"
        },
        size_x: {
          type: "number",
          description: "Width of the card in dashboard grid units"
        },
        size_y: {
          type: "number",
          description: "Height of the card in dashboard grid units"
        },
        collection_id: {
          type: "number",
          description: "ID of the collection to put the card in (optional)"
        },
        parameter_mappings: {
          type: "array",
          description: "Parameter mappings for dashboard filters",
          items: {
            type: "object"
          }
        },
        series: {
          type: "array",
          description: "Additional series to include with this card",
          items: {
            type: "object"
          }
        }
      },
      required: ["dashboard_id", "card_id"]
    }
  },
  {
    name: "create_dashboard",
    description: "Create a new dashboard in Metabase",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the dashboard"
        },
        description: {
          type: "string",
          description: "Description of the dashboard"
        },
        parameters: {
          type: "array",
          description: "Dashboard filter parameters (optional)",
          items: {
            type: "object"
          }
        },
        collection_id: {
          type: "number",
          description: "ID of the collection to put the dashboard in (optional)"
        },
        enable_embedding: {
          type: "boolean",
          description: "Whether to enable embedding for this dashboard"
        },
        auto_apply_filters: {
          type: "boolean",
          description: "Whether filters should auto-apply"
        },
        cache_ttl: {
          type: "number",
          description: "Cache time-to-live in seconds"
        }
      },
      required: ["name"]
    }
  },
  {
    name: "list_collections",
    description: "List all collections in Metabase",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "create_collection",
    description: "Create a new collection in Metabase",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the collection"
        },
        description: {
          type: "string",
          description: "Description of the collection"
        },
        color: {
          type: "string",
          description: "Color for the collection (optional)"
        },
        parent_id: {
          type: "number",
          description: "ID of the parent collection (optional)"
        },
        namespace: {
          type: "string",
          description: "Namespace for the collection"
        },
        authority_level: {
          type: "string",
          description: "Authority level (e.g., 'official')"
        }
      },
      required: ["name"]
    }
  },
  {
    name: "list_tables",
    description: "List all tables in a database",
    inputSchema: {
      type: "object",
      properties: {
        database_id: {
          type: "number",
          description: "ID of the database"
        }
      },
      required: ["database_id"]
    }
  },
  {
    name: "get_table_fields",
    description: "Get all fields/columns in a table",
    inputSchema: {
      type: "object",
      properties: {
        table_id: {
          type: "number",
          description: "ID of the table"
        }
      },
      required: ["table_id"]
    }
  },
  {
    name: "update_dashboard",
    description: "Update an existing dashboard",
    inputSchema: {
      type: "object",
      properties: {
        dashboard_id: {
          type: "number",
          description: "ID of the dashboard to update"
        },
        name: {
          type: "string",
          description: "New name for the dashboard"
        },
        description: {
          type: "string",
          description: "New description for the dashboard"
        },
        parameters: {
          type: "array",
          description: "Updated dashboard filter parameters",
          items: {
            type: "object"
          }
        },
        collection: {
          type: "number",
          description: "New collection ID for the dashboard"
        },
        enable_embedding: {
          type: "boolean",
          description: "Whether to enable embedding"
        },
        auto_apply_filters: {
          type: "boolean",
          description: "Whether filters should auto-apply"
        },
        archived: {
          type: "boolean",
          description: "Whether to archive the dashboard"
        }
      },
      required: ["dashboard_id"]
    }
  },
  {
    name: "delete_dashboard",
    description: "Delete a dashboard",
    inputSchema: {
      type: "object",
      properties: {
        dashboard_id: {
          type: "number",
          description: "ID of the dashboard to delete"
        }
      },
      required: ["dashboard_id"]
    }
  }
];

// Tool execution handler class that implements the tool handler functionality
export class ToolExecutionHandler {
  private log: (level: LogLevel, message: string, data?: unknown, error?: Error) => void;
  private request: <T>(path: string, options?: RequestInit) => Promise<T>;
  private getSessionToken: () => Promise<string>;
  private generateRequestId: () => string;

  constructor(
    logFn: (level: LogLevel, message: string, data?: unknown, error?: Error) => void,
    requestFn: <T>(path: string, options?: RequestInit) => Promise<T>,
    getSessionTokenFn: () => Promise<string>,
    generateRequestIdFn: () => string,
  ) {
    this.log = logFn;
    this.request = requestFn;
    this.getSessionToken = getSessionTokenFn;
    this.generateRequestId = generateRequestIdFn;
  }

  /**
   * Handle tool execution requests
   */
  async executeToolRequest(request: any): Promise<any> {
    const toolName = request.params?.name || 'unknown';
    const requestId = this.generateRequestId();

    this.log(LogLevel.INFO, `Processing tool execution request: ${toolName}`, {
      requestId,
      toolName,
      arguments: request.params?.arguments
    });

    await this.getSessionToken();

    try {
      switch (request.params?.name) {
        case "list_dashboards": {
          this.log(LogLevel.DEBUG, 'Fetching all dashboards from Metabase');
          const response = await this.request<any[]>('/api/dashboard');
          this.log(LogLevel.INFO, `Successfully retrieved ${response.length} dashboards`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }

        case "list_cards": {
          this.log(LogLevel.DEBUG, 'Fetching all cards/questions from Metabase');
          const response = await this.request<any[]>('/api/card');
          this.log(LogLevel.INFO, `Successfully retrieved ${response.length} cards/questions`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }

        case "list_databases": {
          this.log(LogLevel.DEBUG, 'Fetching all databases from Metabase');
          const response = await this.request<any[]>('/api/database');
          this.log(LogLevel.INFO, `Successfully retrieved ${response.length} databases`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }

        case "execute_card": {
          const cardId = request.params?.arguments?.card_id;
          if (!cardId) {
            this.log(LogLevel.WARN, 'Missing card_id parameter in execute_card request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Card ID parameter is required"
            );
          }

          this.log(LogLevel.DEBUG, `Executing card with ID: ${cardId}`);
          const parameters = request.params?.arguments?.parameters || {};

          const response = await this.request<any>(`/api/card/${cardId}/query`, {
            method: 'POST',
            body: JSON.stringify({ parameters })
          });

          this.log(LogLevel.INFO, `Successfully executed card: ${cardId}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }

        case "get_dashboard_cards": {
          const dashboardId = request.params?.arguments?.dashboard_id;
          if (!dashboardId) {
            this.log(LogLevel.WARN, 'Missing dashboard_id parameter in get_dashboard_cards request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Dashboard ID parameter is required"
            );
          }

          this.log(LogLevel.DEBUG, `Fetching cards for dashboard with ID: ${dashboardId}`);
          const response = await this.request<any>(`/api/dashboard/${dashboardId}`);

          const cardCount = response.cards?.length || 0;
          this.log(LogLevel.INFO, `Successfully retrieved ${cardCount} cards from dashboard: ${dashboardId}`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response.cards, null, 2)
            }]
          };
        }

        case "execute_query": {
          const databaseId = request.params?.arguments?.database_id;
          const query = request.params?.arguments?.query;
          const nativeParameters = request.params?.arguments?.native_parameters || [];

          if (!databaseId) {
            this.log(LogLevel.WARN, 'Missing database_id parameter in execute_query request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Database ID parameter is required"
            );
          }

          if (!query) {
            this.log(LogLevel.WARN, 'Missing query parameter in execute_query request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "SQL query parameter is required"
            );
          }

          this.log(LogLevel.DEBUG, `Executing SQL query against database ID: ${databaseId}`);

          // Build query request body
          const queryData = {
            type: "native",
            native: {
              query: query,
              template_tags: {}
            },
            parameters: nativeParameters,
            database: databaseId
          };

          const response = await this.request<any>('/api/dataset', {
            method: 'POST',
            body: JSON.stringify(queryData)
          });

          this.log(LogLevel.INFO, `Successfully executed SQL query against database: ${databaseId}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "create_card": {
          const { name, database_id, query, description, visualization_settings } = request.params?.arguments || {};
          
          if (!name || !database_id || !query) {
            this.log(LogLevel.WARN, 'Missing required parameters in create_card request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Name, database ID and query parameters are required"
            );
          }
          
          this.log(LogLevel.DEBUG, `Creating card with name: ${name}`);
          
          const cardData = {
            name,
            dataset_query: {
              type: "native",
              native: {
                query,
                template_tags: {}
              },
              database: database_id
            },
            display: "table",
            description: description || "",
            visualization_settings: visualization_settings || {}
          };
          
          const response = await this.request<any>('/api/card', {
            method: 'POST',
            body: JSON.stringify(cardData)
          });
          
          this.log(LogLevel.INFO, `Successfully created card: ${name} with ID: ${response.id}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "update_card_visualization": {
          const { card_id, visualization_settings } = request.params?.arguments || {};
          
          if (!card_id || !visualization_settings) {
            this.log(LogLevel.WARN, 'Missing required parameters in update_card_visualization request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Card ID and visualization settings parameters are required"
            );
          }
          
          this.log(LogLevel.DEBUG, `Updating visualization settings for card ID: ${card_id}`);
          
          // First get the current card
          const card = await this.request<any>(`/api/card/${card_id}`);
          
          // Update the visualization settings
          const updateData = {
            ...card,
            visualization_settings
          };
          
          const response = await this.request<any>(`/api/card/${card_id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
          });
          
          this.log(LogLevel.INFO, `Successfully updated visualization settings for card: ${card_id}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "add_card_to_dashboard": {
          const { dashboard_id, card_id, row, col, size_x, size_y, parameter_mappings, series } = request.params?.arguments || {};
          
          if (!dashboard_id || !card_id) {
            this.log(LogLevel.WARN, 'Missing required parameters in add_card_to_dashboard request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Dashboard ID and card ID parameters are required"
            );
          }
          
          this.log(LogLevel.DEBUG, `Adding card ${card_id} to dashboard ${dashboard_id}`);
          
          const dashboardCardData = {
            cardId: card_id,
            dashboard_id: dashboard_id,
            parameter_mappings: parameter_mappings || [],
            visualization_settings: {},
            series: series || [],
            row: row || 0,
            col: col || 0,
            size_x: size_x || 4,
            size_y: size_y || 4
          };
          
          const response = await this.request<any>(`/api/dashboard/${dashboard_id}/cards`, {
            method: 'POST',
            body: JSON.stringify(dashboardCardData)
          });
          
          this.log(LogLevel.INFO, `Successfully added card ${card_id} to dashboard ${dashboard_id}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "create_dashboard": {
          const { name, description, parameters, collection } = request.params?.arguments || {};
          
          if (!name) {
            this.log(LogLevel.WARN, 'Missing name parameter in create_dashboard request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Dashboard name parameter is required"
            );
          }
          
          this.log(LogLevel.DEBUG, `Creating dashboard with name: ${name}`);
          
          const dashboardData: any = {
            name,
            description: description || "",
            parameters: parameters || []
          };
          
          if (collection) {
            dashboardData.collection = collection;
          }
          
          const response = await this.request<any>('/api/dashboard', {
            method: 'POST',
            body: JSON.stringify(dashboardData)
          });
          
          this.log(LogLevel.INFO, `Successfully created dashboard: ${name} with ID: ${response.id}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "list_collections": {
          this.log(LogLevel.DEBUG, 'Fetching all collections from Metabase');
          const response = await this.request<any[]>('/api/collection');
          this.log(LogLevel.INFO, `Successfully retrieved ${response.length} collections`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "create_collection": {
          const { name, description, color, parent_id } = request.params?.arguments || {};
          
          if (!name) {
            this.log(LogLevel.WARN, 'Missing name parameter in create_collection request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Collection name parameter is required"
            );
          }
          
          this.log(LogLevel.DEBUG, `Creating collection with name: ${name}`);
          
          const collectionData: any = {
            name,
            description: description || ""
          };
          
          if (color) {
            collectionData.color = color;
          }
          
          if (parent_id) {
            collectionData.parent_id = parent_id;
          }
          
          const response = await this.request<any>('/api/collection', {
            method: 'POST',
            body: JSON.stringify(collectionData)
          });
          
          this.log(LogLevel.INFO, `Successfully created collection: ${name} with ID: ${response.id}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "list_tables": {
          const { database_id } = request.params?.arguments || {};
          
          if (!database_id) {
            this.log(LogLevel.WARN, 'Missing database_id parameter in list_tables request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Database ID parameter is required"
            );
          }
          
          this.log(LogLevel.DEBUG, `Fetching tables for database ID: ${database_id}`);
          const response = await this.request<any[]>(`/api/database/${database_id}/tables`);
          this.log(LogLevel.INFO, `Successfully retrieved ${response.length} tables from database: ${database_id}`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "get_table_fields": {
          const { table_id } = request.params?.arguments || {};
          
          if (!table_id) {
            this.log(LogLevel.WARN, 'Missing table_id parameter in get_table_fields request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Table ID parameter is required"
            );
          }
          
          this.log(LogLevel.DEBUG, `Fetching fields for table ID: ${table_id}`);
          const response = await this.request<any[]>(`/api/table/${table_id}/fields`);
          this.log(LogLevel.INFO, `Successfully retrieved ${response.length} fields from table: ${table_id}`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "update_dashboard": {
          const { dashboard_id, name, description, parameters, collection } = request.params?.arguments || {};
          
          if (!dashboard_id) {
            this.log(LogLevel.WARN, 'Missing dashboard_id parameter in update_dashboard request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Dashboard ID parameter is required"
            );
          }
          
          this.log(LogLevel.DEBUG, `Updating dashboard with ID: ${dashboard_id}`);
          
          // First get the current dashboard
          const dashboard = await this.request<any>(`/api/dashboard/${dashboard_id}`);
          
          // Build update data
          const updateData: any = { ...dashboard };
          
          if (name) updateData.name = name;
          if (description) updateData.description = description;
          if (parameters) updateData.parameters = parameters;
          if (collection) updateData.collection = collection;
          
          const response = await this.request<any>(`/api/dashboard/${dashboard_id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
          });
          
          this.log(LogLevel.INFO, `Successfully updated dashboard with ID: ${dashboard_id}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }
        
        case "delete_dashboard": {
          const { dashboard_id } = request.params?.arguments || {};
          
          if (!dashboard_id) {
            this.log(LogLevel.WARN, 'Missing dashboard_id parameter in delete_dashboard request', { requestId });
            throw new McpError(
              ErrorCode.InvalidParams,
              "Dashboard ID parameter is required"
            );
          }
          
          this.log(LogLevel.DEBUG, `Deleting dashboard with ID: ${dashboard_id}`);
          
          await this.request<any>(`/api/dashboard/${dashboard_id}`, {
            method: 'DELETE'
          });
          
          this.log(LogLevel.INFO, `Successfully deleted dashboard with ID: ${dashboard_id}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ success: true, id: dashboard_id }, null, 2)
            }]
          };
        }

        default:
          this.log(LogLevel.WARN, `Received request for unknown tool: ${request.params?.name}`, { requestId });
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${request.params?.name}`
              }
            ],
            isError: true
          };
      }
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.data?.message || apiError.message || 'Unknown error';

      this.log(LogLevel.ERROR, `Tool execution failed: ${errorMessage}`, error);
      return {
        content: [{
          type: "text",
          text: `Metabase API error: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
} 