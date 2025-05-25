import { ToolExecutionHandler, LogLevel, McpError, ErrorCode } from './tools';

// Mock functions
const logFn = jest.fn();
const requestFn = jest.fn();
const getSessionTokenFn = jest.fn(() => Promise.resolve('dummy_token'));
const generateRequestIdFn = jest.fn(() => 'test-request-id');

describe('ToolExecutionHandler', () => {
  let handler: ToolExecutionHandler;

  beforeEach(() => {
    // Reset mocks before each test
    logFn.mockClear();
    requestFn.mockClear();
    getSessionTokenFn.mockClear();
    generateRequestIdFn.mockClear();
    handler = new ToolExecutionHandler(logFn, requestFn, getSessionTokenFn, generateRequestIdFn);
  });

  describe('get_card_details', () => {
    it('should successfully get card details', async () => {
      const mockCardData = { id: 123, name: 'Test Card', description: 'A test card' };
      requestFn.mockResolvedValueOnce(mockCardData);

      const result = await handler.executeToolRequest({
        params: {
          name: 'get_card_details',
          arguments: { card_id: 123 },
        },
      });

      expect(requestFn).toHaveBeenCalledWith('/api/card/123', undefined); // Method defaults to GET if not specified in this.request
      expect(result.content[0].text).toEqual(JSON.stringify(mockCardData, null, 2));
      expect(logFn).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Successfully retrieved details for card ID: 123'), expect.any(Object));
    });

    it('should throw McpError if card_id is missing', async () => {
      await expect(
        handler.executeToolRequest({
          params: {
            name: 'get_card_details',
            arguments: {}, // Missing card_id
          },
        })
      ).rejects.toThrow(new McpError(ErrorCode.InvalidParams, 'Card ID parameter is required'));
      expect(logFn).toHaveBeenCalledWith(LogLevel.WARN, expect.stringContaining('Missing card_id parameter'), expect.any(Object));
    });
  });

  describe('update_card', () => {
    const cardId = 456;
    it('should successfully update card name', async () => {
      const updatedCardData = { id: cardId, name: 'Updated Test Card' };
      requestFn.mockResolvedValueOnce(updatedCardData);

      const result = await handler.executeToolRequest({
        params: {
          name: 'update_card',
          arguments: { card_id: cardId, name: 'Updated Test Card' },
        },
      });

      expect(requestFn).toHaveBeenCalledWith(`/api/card/${cardId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Test Card' }),
      });
      expect(result.content[0].text).toEqual(JSON.stringify(updatedCardData, null, 2));
      expect(logFn).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining(`Successfully updated card ID: ${cardId}`), expect.any(Object));
    });

    it('should successfully update card query', async () => {
      const updatedCardData = { id: cardId, name: 'Card with new query' };
      requestFn.mockResolvedValueOnce(updatedCardData);
      const newQuery = 'SELECT * FROM new_table';

      const result = await handler.executeToolRequest({
        params: {
          name: 'update_card',
          arguments: { card_id: cardId, query: newQuery },
        },
      });
      
      expect(requestFn).toHaveBeenCalledWith(`/api/card/${cardId}`, {
        method: 'PUT',
        body: JSON.stringify({
          dataset_query: {
            type: 'native',
            native: { query: newQuery },
          },
        }),
      });
      expect(result.content[0].text).toEqual(JSON.stringify(updatedCardData, null, 2));
    });
    
    it('should throw McpError if card_id is missing', async () => {
      await expect(
        handler.executeToolRequest({
          params: {
            name: 'update_card',
            arguments: { name: 'New Name' }, // Missing card_id
          },
        })
      ).rejects.toThrow(new McpError(ErrorCode.InvalidParams, 'Card ID parameter is required'));
    });

    it('should throw McpError if no update parameters are provided', async () => {
      await expect(
        handler.executeToolRequest({
          params: {
            name: 'update_card',
            arguments: { card_id: cardId }, // No actual fields to update
          },
        })
      ).rejects.toThrow(new McpError(ErrorCode.InvalidParams, 'At least one modifiable field (name, query, description, collection_id, visualization_settings) must be provided for update.'));
    });
  });

  describe('delete_card', () => {
    const cardId = 789;
    it('should successfully delete a card', async () => {
      requestFn.mockResolvedValueOnce(undefined); // DELETE returns 204 No Content

      const result = await handler.executeToolRequest({
        params: {
          name: 'delete_card',
          arguments: { card_id: cardId },
        },
      });

      expect(requestFn).toHaveBeenCalledWith(`/api/card/${cardId}`, { method: 'DELETE' });
      expect(result.content[0].text).toEqual(`Card ID ${cardId} deleted successfully.`);
      expect(logFn).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining(`Successfully deleted card ID: ${cardId}`), expect.any(Object));
    });

    it('should throw McpError if card_id is missing', async () => {
      await expect(
        handler.executeToolRequest({
          params: {
            name: 'delete_card',
            arguments: {}, // Missing card_id
          },
        })
      ).rejects.toThrow(new McpError(ErrorCode.InvalidParams, 'Card ID parameter is required'));
    });
  });

  describe('list_dashboards', () => {
    it('should successfully list dashboards', async () => {
      const mockDashboards = [{ id: 1, name: 'Dashboard 1' }, { id: 2, name: 'Dashboard 2' }];
      requestFn.mockResolvedValueOnce(mockDashboards);

      const result = await handler.executeToolRequest({
        params: {
          name: 'list_dashboards',
          arguments: {},
        },
      });

      expect(requestFn).toHaveBeenCalledWith('/api/dashboard', undefined);
      expect(result.content[0].text).toEqual(JSON.stringify(mockDashboards, null, 2));
      expect(logFn).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining(`Successfully retrieved ${mockDashboards.length} dashboards`), expect.any(Object));
    });
  });

  describe('get_dashboard_details', () => {
    const dashboardId = 101;
    it('should successfully get dashboard details', async () => {
      const mockDashboardData = { id: dashboardId, name: 'Sales Dashboard', cards: [] };
      requestFn.mockResolvedValueOnce(mockDashboardData);

      const result = await handler.executeToolRequest({
        params: {
          name: 'get_dashboard_details',
          arguments: { dashboard_id: dashboardId },
        },
      });

      expect(requestFn).toHaveBeenCalledWith(`/api/dashboard/${dashboardId}`, undefined);
      expect(result.content[0].text).toEqual(JSON.stringify(mockDashboardData, null, 2));
      expect(logFn).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining(`Successfully retrieved details for dashboard ID: ${dashboardId}`), expect.any(Object));
    });

    it('should throw McpError if dashboard_id is missing', async () => {
      await expect(
        handler.executeToolRequest({
          params: {
            name: 'get_dashboard_details',
            arguments: {}, // Missing dashboard_id
          },
        })
      ).rejects.toThrow(new McpError(ErrorCode.InvalidParams, 'Dashboard ID parameter is required'));
    });
  });
});
