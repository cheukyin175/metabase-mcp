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
    name: "list_cards",
    description: "List all questions/cards in Metabase",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "list_databases",
    description: "List all databases in Metabase",
    inputSchema: {
      type: "object",
      properties: {}
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
        }
      },
      required: ["card_id"]
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
        collection_id: {
          type: "number",
          description: "ID of the collection to add the card to"
        },
        visualization_settings: {
          type: "object",
          description: "Visualization settings for the card"
        }
      },
      required: ["name", "database_id", "query"]
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
    name: "get_card_details",
    description: "Get details of a specific question/card in Metabase",
    inputSchema: {
      type: "object",
      properties: {
        card_id: {
          type: "number",
          description: "ID of the card/question"
        }
      },
      required: ["card_id"]
    }
  },
  {
    name: "update_card",
    description: "Update an existing question/card in Metabase",
    inputSchema: {
      type: "object",
      properties: {
        card_id: {
          type: "number",
          description: "ID of the card/question to update"
        },
        name: {
          type: "string",
          description: "New name for the card (optional)"
        },
        query: {
          type: "string",
          description: "New SQL query for the card (optional)"
        },
        description: {
          type: "string",
          description: "New description for the card (optional)"
        },
        collection_id: {
          type: "number",
          description: "New ID of the collection for the card (optional)"
        },
        visualization_settings: {
          type: "object",
          description: "New visualization settings (optional)"
        }
      },
      required: ["card_id"]
    }
  },
  {
    name: "delete_card",
    description: "Delete a question/card in Metabase",
    inputSchema: {
      type: "object",
      properties: {
        card_id: {
          type: "number",
          description: "ID of the card/question to delete"
        }
      },
      required: ["card_id"]
    }
  },
  {
    name: "list_dashboards",
    description: "List all dashboards in Metabase",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_dashboard_details",
    description: "Get details of a specific dashboard in Metabase",
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
          const response = await this.request<any>('/api/database');
          // The response is expected to be an object with a 'data' property (array of databases)
          const dbs = Array.isArray(response.data) ? response.data : [];
          const parsed = dbs.map((db: any) => ({
            id: db.id,
            name: db.name,
            dbname: db.details?.dbname
          }));
          this.log(LogLevel.INFO, `Successfully retrieved ${parsed.length} databases`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(parsed, null, 2)
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
          const { name, database_id, query, description, collection_id, visualization_settings } = request.params?.arguments || {};
          
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
            collection_id: collection_id || null,
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
          const response = await this.request<any>(`/api/database/${database_id}/metadata`);
          const tables = response.tables || [];
          const formattedTables = tables.map((t: any) => `ID: ${t.id} | ${t.schema || ''}.${t.name || ''} - ${t.description || ''}`);
          this.log(LogLevel.INFO, `Successfully retrieved ${tables.length} tables from database: ${database_id}`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify(formattedTables, null, 2)
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
          const response = await this.request<any>(`/api/table/${table_id}/query_metadata`);
          
          // Check if fields property exists and is an array
          const fields = response.fields || [];
          this.log(LogLevel.INFO, `Successfully retrieved ${fields.length} fields from table: ${table_id}`);

          // Format the fields following the jq-like structure
          const formattedFields = fields.map((field: any) => ({
            id: field.id,
            name: field.name,
            display_name: field.display_name,
            type: field.base_type,
            foreign_key: field.semantic_type === "type/FK"
              ? { target_table_id: field.target?.table_id }
              : "No"
          }));

          return {
            content: [{
              type: "text",
              text: JSON.stringify(formattedFields, null, 2)
            }]
          };
        }

        case "get_card_details": {
          const cardId = request.params?.arguments?.card_id;
          if (!cardId) {
            this.log(LogLevel.WARN, 'Missing card_id parameter in get_card_details request', { requestId });
            throw new McpError(ErrorCode.InvalidParams, "Card ID parameter is required");
          }

          this.log(LogLevel.DEBUG, `Fetching details for card ID: ${cardId}`, { requestId });
          const response = await this.request<any>(`/api/card/${cardId}`);
          this.log(LogLevel.INFO, `Successfully retrieved details for card ID: ${cardId}`, { requestId });

          return {
            content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
          };
        }

        case "update_card": {
          const cardId = request.params?.arguments?.card_id;
          if (!cardId) {
            this.log(LogLevel.WARN, 'Missing card_id parameter in update_card request', { requestId });
            throw new McpError(ErrorCode.InvalidParams, "Card ID parameter is required");
          }

          const { name, query, description, collection_id, visualization_settings } = request.params?.arguments || {};
          if (!name && !query && !description && collection_id === undefined && !visualization_settings) {
            this.log(LogLevel.WARN, 'No update parameters provided for update_card request', { requestId });
            throw new McpError(ErrorCode.InvalidParams, "At least one modifiable field (name, query, description, collection_id, visualization_settings) must be provided for update.");
          }

          this.log(LogLevel.DEBUG, `Updating card ID: ${cardId}`, { requestId, arguments: request.params?.arguments });

          const payload: any = {};
          if (name) payload.name = name;
          if (description) payload.description = description;
          if (collection_id !== undefined) payload.collection_id = collection_id;
          if (visualization_settings) payload.visualization_settings = visualization_settings;
          if (query) {
            // Assuming the card's current database_id will be used by Metabase
            // or that it doesn't need to be re-specified if not changing.
            // Fetching the card's current database_id first could be a more robust solution
            // if Metabase strictly requires it in the payload for query updates.
            payload.dataset_query = {
              type: "native",
              native: { query: query },
              // database: cardDetails.database_id // Would need to fetch cardDetails first
            };
          }

          const response = await this.request<any>(`/api/card/${cardId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });

          this.log(LogLevel.INFO, `Successfully updated card ID: ${cardId}`, { requestId });
          return {
            content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
          };
        }

        case "delete_card": {
          const cardId = request.params?.arguments?.card_id;
          if (!cardId) {
            this.log(LogLevel.WARN, 'Missing card_id parameter in delete_card request', { requestId });
            throw new McpError(ErrorCode.InvalidParams, "Card ID parameter is required");
          }

          this.log(LogLevel.DEBUG, `Deleting card ID: ${cardId}`, { requestId });
          // Metabase API for DELETE card returns 204 No Content on success
          await this.request<void>(`/api/card/${cardId}`, { method: 'DELETE' });
          this.log(LogLevel.INFO, `Successfully deleted card ID: ${cardId}`, { requestId });

          return {
            content: [{ type: "text", text: `Card ID ${cardId} deleted successfully.` }]
          };
        }

        case "list_dashboards": {
          this.log(LogLevel.DEBUG, 'Fetching all dashboards from Metabase', { requestId });
          const response = await this.request<any[]>('/api/dashboard');
          this.log(LogLevel.INFO, `Successfully retrieved ${response.length} dashboards`, { requestId });

          return {
            content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
          };
        }

        case "get_dashboard_details": {
          const dashboardId = request.params?.arguments?.dashboard_id;
          if (!dashboardId) {
            this.log(LogLevel.WARN, 'Missing dashboard_id parameter in get_dashboard_details request', { requestId });
            throw new McpError(ErrorCode.InvalidParams, "Dashboard ID parameter is required");
          }

          this.log(LogLevel.DEBUG, `Fetching details for dashboard ID: ${dashboardId}`, { requestId });
          const response = await this.request<any>(`/api/dashboard/${dashboardId}`);
          this.log(LogLevel.INFO, `Successfully retrieved details for dashboard ID: ${dashboardId}`, { requestId });

          return {
            content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
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

      // Handle cases where the error might not have a 'status' property (e.g. network errors)
      // For 204 No Content from delete_card, it might be caught here if not handled earlier
      // However, the current this.request is expected to handle 204 as success.
      // This generic catch is more for unexpected errors or actual API error responses.
      if (error instanceof McpError) { // Re-throw McpErrors directly
        throw error;
      }

      this.log(LogLevel.ERROR, `Tool execution failed: ${errorMessage}`, { requestId, error });
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