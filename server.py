#!/usr/bin/env python3
"""
Metabase FastMCP Server

A FastMCP server that provides tools to interact with Metabase databases,
execute queries, manage cards, and work with collections.
"""

import asyncio
import logging
import os
import time
from collections import defaultdict
from enum import Enum
from typing import Any

import httpx
from dotenv import load_dotenv
from fastmcp import FastMCP

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Metabase configuration from environment variables
METABASE_URL = os.getenv("METABASE_URL")
METABASE_USER_EMAIL = os.getenv("METABASE_USER_EMAIL")
METABASE_PASSWORD = os.getenv("METABASE_PASSWORD")
METABASE_API_KEY = os.getenv("METABASE_API_KEY")

if not METABASE_URL or (
    not METABASE_API_KEY and (not METABASE_USER_EMAIL or not METABASE_PASSWORD)
):
    raise ValueError(
        "METABASE_URL is required, and either METABASE_API_KEY or both METABASE_USER_EMAIL and METABASE_PASSWORD must be provided"
    )


# Authentication method enum
class AuthMethod(Enum):
    SESSION = "session"
    API_KEY = "api_key"


# Initialize FastMCP server
mcp = FastMCP(name="metabase-mcp")


class MetabaseClient:
    """HTTP client for Metabase API operations"""

    def __init__(self):
        self.base_url = METABASE_URL.rstrip("/")
        self.session_token: str | None = None
        self.api_key: str | None = METABASE_API_KEY
        self.auth_method = AuthMethod.API_KEY if METABASE_API_KEY else AuthMethod.SESSION
        self.client = httpx.AsyncClient(timeout=30.0)

        logger.info(f"Using {self.auth_method.value} authentication method")

    async def _get_headers(self) -> dict[str, str]:
        """Get appropriate authentication headers"""
        headers = {"Content-Type": "application/json"}

        if self.auth_method == AuthMethod.API_KEY and self.api_key:
            headers["X-API-KEY"] = self.api_key
        elif self.auth_method == AuthMethod.SESSION:
            if not self.session_token:
                await self._get_session_token()
            if self.session_token:
                headers["X-Metabase-Session"] = self.session_token

        return headers

    async def _get_session_token(self) -> str:
        """Get Metabase session token for email/password authentication"""
        if self.auth_method == AuthMethod.API_KEY and self.api_key:
            return self.api_key

        if not METABASE_USER_EMAIL or not METABASE_PASSWORD:
            raise ValueError("Email and password required for session authentication")

        login_data = {"username": METABASE_USER_EMAIL, "password": METABASE_PASSWORD}

        response = await self.client.post(f"{self.base_url}/api/session", json=login_data)

        if response.status_code != 200:
            error_data = response.json() if response.content else {}
            raise Exception(f"Authentication failed: {response.status_code} - {error_data}")

        session_data = response.json()
        self.session_token = session_data.get("id")
        logger.info("Successfully obtained session token")
        return self.session_token

    async def request(self, method: str, path: str, **kwargs) -> dict[str, Any]:
        """Make authenticated request to Metabase API"""
        url = f"{self.base_url}/api{path}"
        headers = await self._get_headers()

        logger.debug(f"Making {method} request to {path}")

        response = await self.client.request(method=method, url=url, headers=headers, **kwargs)

        if not response.is_success:
            error_data = response.json() if response.content else {}
            error_message = (
                f"API request failed with status {response.status_code}: {response.text}"
            )
            logger.warning(f"{error_message} - {error_data}")
            raise Exception(error_message)

        logger.debug(f"Successful response from {path}")
        return response.json()

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global client instance
metabase_client = MetabaseClient()


# Tool implementations
@mcp.tool
async def find_candidate_collections(
    query: str,
    limit_collections: int = 10
) -> dict[str, Any]:
    """
    Find collections whose names contain the query words.
    Simple collection name matching - fast and reliable.

    Args:
        query: Text to search for in collection names.
        limit_collections: Max collections to return.
    """
    try:
        # Get all collections
        collections = await metabase_client.request("GET", "/collection")
        
        if not isinstance(collections, list):
            return {
                "query": query,
                "collections": [],
                "results": {"total_collections_searched": 0, "matched_collections": 0}
            }

        # Search collection names
        search_term = query.strip().lower()
        matched_collections = []
        
        for collection in collections:
            if not collection:  # Skip None collections
                continue
                
            collection_name = (collection.get("name") or "").lower()
            collection_desc = (collection.get("description") or "").lower()
            
            # Check if query matches collection name or description
            if (search_term in collection_name or 
                search_term in collection_desc):
                matched_collections.append({
                    "collection_id": collection.get("id"),
                    "collection_name": collection.get("name"),
                    "description": collection.get("description"),
                    "parent_id": collection.get("parent_id"),
                    "archived": collection.get("archived", False)
                })

        # Sort by name and apply limit
        matched_collections.sort(key=lambda x: x.get("collection_name", "").lower())
        limited_collections = matched_collections[:limit_collections]

        return {
            "query": query,
            "collections": limited_collections,
            "results": {
                "total_collections_searched": len(collections),
                "matched_collections": len(matched_collections),
                "returned_collections": len(limited_collections)
            },
            "note": "Collections matching query in name or description. Use search_cards_in_collections next."
        }
        
    except Exception as e:
        logger.error(f"Error finding candidate collections: {e}")
        raise


@mcp.tool
async def search_cards_in_collections(
    query: str,
    collection_ids: list[int],
    limit: int = 25,
    offset: int = 0
) -> dict[str, Any]:
    """
    Search for cards within specific collections by getting all cards from each collection
    and filtering by query in card names and descriptions.

    Args:
        query: Text to search for in card names and descriptions.
        collection_ids: List of collection IDs to search within.
        limit: Max cards to return (page size).
        offset: Number of matches to skip (pagination).
    """
    try:
        search_term = query.strip().lower()
        all_matches = []

        # Get cards from each collection
        for collection_id in collection_ids:
            try:
                # Use existing list_cards_by_collection logic
                all_cards = await metabase_client.request("GET", "/card")
                
                if isinstance(all_cards, list):
                    # Filter by collection_id
                    collection_cards = [
                        card for card in all_cards 
                        if card.get("collection_id") == collection_id
                    ]
                    
                    # Search within these cards
                    for card in collection_cards:
                        card_name = (card.get("name") or "").lower()
                        card_description = (card.get("description") or "").lower()
                        
                        # Check if search term is in name or description
                        if (search_term in card_name or 
                            search_term in card_description):
                            # Keep only essential fields
                            matched_card = {
                                "id": card.get("id"),
                                "name": card.get("name"),
                                "description": card.get("description"),
                                "collection_id": card.get("collection_id"),
                                "updated_at": card.get("updated_at"),
                                "created_at": card.get("created_at")
                            }
                            all_matches.append(matched_card)
                            
            except Exception as e:
                logger.warning(f"Error searching collection {collection_id}: {e}")
                continue

        # Sort by updated_at desc (most recent first)
        all_matches.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
        
        total_found = len(all_matches)

        # Apply pagination
        paginated_matches = all_matches[offset:offset + limit]

        return {
            "query": query,
            "collections_searched": collection_ids,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "returned": len(paginated_matches),
                "total_found": total_found,
                "has_more": offset + limit < total_found,
            },
            "cards": paginated_matches,
            "note": f"Searched {len(collection_ids)} collections for '{query}'. Found {total_found} matching cards."
        }

    except Exception as e:
        logger.error(f"Error searching cards in collections: {e}")
        raise


@mcp.tool
async def search_metabase(
    query: str,
    limit: int = 20,
    models: list[str] | None = None,
    archived: bool = False,
    search_native_query: bool | None = None
) -> dict[str, Any]:
    """
    Search for items in Metabase using the search API.
    
    Args:
        query: Search term to find in item names and descriptions
        limit: Maximum number of results to return (default: 20)
        models: List of item types to filter by (e.g., ["card", "dashboard", "collection"])
        archived: Include archived items in results (default: False)
        search_native_query: Search within native SQL queries (default: None)
    """
    try:
        # Build base query parameters
        params = {
            "q": query,
            "limit": limit,
            "archived": str(archived).lower()
        }

        # Add optional parameters
        if search_native_query is True:
            params["search_native_query"] = "true"

        # Build query string to handle multiple models parameters
        from urllib.parse import urlencode
        if models is not None:
            params["models"] = models
        query_string = urlencode(params, doseq=True)
        result = await metabase_client.request("GET", f"/search?{query_string}")

        # Add search metadata to response
        search_info = {
            "query": query,
            "limit": limit,
            "models": models,
            "total_results": len(result.get("data", []) if isinstance(result, dict) else result),
        }

        if isinstance(result, dict):
            result["search_info"] = search_info
        else:
            result = {
                "data": result,
                "search_info": search_info
            }

        return result

    except Exception as e:
        logger.error(f"Error searching Metabase: {e}")
        raise


@mcp.tool
async def list_databases() -> dict[str, Any]:
    """List all databases in Metabase"""
    try:
        result = await metabase_client.request("GET", "/database")
        return result
    except Exception as e:
        logger.error(f"Error listing databases: {e}")
        raise


@mcp.tool
async def list_cards() -> dict[str, Any]:
    """List all questions/cards in Metabase (WARNING: Large dataset - 1700+ cards, may timeout)"""
    try:
        result = await metabase_client.request("GET", "/card")
        return result
    except Exception as e:
        logger.error(f"Error listing cards: {e}")
        raise


@mcp.tool
async def list_cards_paginated(limit: int = 50, offset: int = 0, filter_type: str = "all") -> dict[str, Any]:
    """
    List cards with pagination and filtering to avoid timeout issues
    
    Args:
        limit: Maximum number of cards to return (default: 50)
        offset: Number of cards to skip (default: 0) 
        filter_type: Filter type - 'all', 'mine', 'bookmarked', 'archived' (default: 'all')
    """
    try:
        # Build query parameters
        params = {}
        if filter_type != "all":
            params["f"] = filter_type
            
        # Convert params to query string
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        endpoint = f"/card?{query_string}" if query_string else "/card"
        
        result = await metabase_client.request("GET", endpoint)
        
        # Apply pagination manually since Metabase API doesn't support limit/offset for cards
        if isinstance(result, list):
            paginated_result = result[offset:offset + limit]
            return {
                "cards": paginated_result,
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "returned": len(paginated_result),
                    "total_available": len(result),
                    "has_more": offset + limit < len(result)
                },
                "filter": filter_type
            }
        else:
            return result
            
    except Exception as e:
        logger.error(f"Error listing cards with pagination: {e}")
        raise

@mcp.tool
async def list_cards_by_collection(collection_id: int) -> dict[str, Any]:
    """
    List cards in a specific collection (smaller, focused dataset)
    
    Args:
        collection_id: ID of the collection to filter by
    """
    try:
        # Get all cards first, then filter by collection
        # Note: Metabase API doesn't have direct collection filtering for cards
        result = await metabase_client.request("GET", "/card")
        
        if isinstance(result, list):
            # Filter by collection_id
            filtered_cards = [
                card for card in result 
                if card.get("collection_id") == collection_id
            ]
            
            return {
                "cards": filtered_cards,
                "collection_id": collection_id,
                "count": len(filtered_cards),
                "message": f"Found {len(filtered_cards)} cards in collection {collection_id}"
            }
        else:
            return result
            
    except Exception as e:
        logger.error(f"Error listing cards by collection {collection_id}: {e}")
        raise


@mcp.tool
async def execute_card(card_id: int, parameters: dict[str, Any] | None = None) -> dict[str, Any]:
    """Execute a Metabase question/card and get results"""
    try:
        payload = {}
        if parameters:
            payload["parameters"] = parameters

        result = await metabase_client.request("POST", f"/card/{card_id}/query", json=payload)
        return result
    except Exception as e:
        logger.error(f"Error executing card {card_id}: {e}")
        raise


@mcp.tool
async def execute_query(
    database_id: int, query: str, native_parameters: list[dict[str, Any]] | None = None
) -> dict[str, Any]:
    """Execute a SQL query against a Metabase database"""
    try:
        payload = {"database": database_id, "type": "native", "native": {"query": query}}

        if native_parameters:
            payload["native"]["parameters"] = native_parameters

        result = await metabase_client.request("POST", "/dataset", json=payload)
        return result
    except Exception as e:
        logger.error(f"Error executing query: {e}")
        raise


@mcp.tool
async def create_card(
    name: str,
    database_id: int,
    query: str,
    description: str | None = None,
    collection_id: int | None = None,
    visualization_settings: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a new question/card in Metabase"""
    try:
        payload = {
            "name": name,
            "database_id": database_id,
            "dataset_query": {
                "database": database_id,
                "type": "native",
                "native": {"query": query},
            },
            "display": "table",
            "visualization_settings": visualization_settings or {},
        }

        if description:
            payload["description"] = description
        if collection_id is not None:
            payload["collection_id"] = collection_id

        result = await metabase_client.request("POST", "/card", json=payload)
        return result
    except Exception as e:
        logger.error(f"Error creating card: {e}")
        raise


@mcp.tool
async def list_collections() -> dict[str, Any]:
    """List all collections in Metabase"""
    try:
        result = await metabase_client.request("GET", "/collection")
        return result
    except Exception as e:
        logger.error(f"Error listing collections: {e}")
        raise


@mcp.tool
async def create_collection(
    name: str,
    description: str | None = None,
    color: str | None = None,
    parent_id: int | None = None,
) -> dict[str, Any]:
    """Create a new collection in Metabase"""
    try:
        payload = {"name": name}

        if description:
            payload["description"] = description
        if color:
            payload["color"] = color
        if parent_id is not None:
            payload["parent_id"] = parent_id

        result = await metabase_client.request("POST", "/collection", json=payload)
        return result
    except Exception as e:
        logger.error(f"Error creating collection: {e}")
        raise


@mcp.tool
async def list_tables(database_id: int) -> str:
    """List all tables in a database with formatted markdown output"""
    try:
        result = await metabase_client.request("GET", f"/database/{database_id}/metadata")
        
        # Extract tables from the metadata response
        tables = result.get("tables", [])
        
        # Format tables with only the requested fields: table_id, display_name, description, entity_type
        formatted_tables = []
        for table in tables:
            table_info = {
                "table_id": table.get("id"),
                "display_name": table.get("display_name"),
                "description": table.get("description") or "No description",
                "entity_type": table.get("entity_type")
            }
            formatted_tables.append(table_info)
        
        # Sort by display_name for better readability
        formatted_tables.sort(key=lambda x: x.get("display_name", ""))
        
        # Generate markdown output
        markdown_output = f"# Tables in Database {database_id}\n\n"
        markdown_output += f"**Total Tables:** {len(formatted_tables)}\n\n"
        
        if not formatted_tables:
            markdown_output += "*No tables found in this database.*\n"
            return markdown_output
        
        # Create markdown table
        markdown_output += "| Table ID | Display Name | Description | Entity Type |\n"
        markdown_output += "|----------|--------------|-------------|--------------|\n"
        
        for table in formatted_tables:
            table_id = table.get("table_id", "N/A")
            display_name = table.get("display_name", "N/A")
            description = table.get("description", "No description")
            entity_type = table.get("entity_type", "N/A")
            
            # Escape pipe characters in content to prevent table formatting issues
            description = description.replace("|", "\\|")
            display_name = display_name.replace("|", "\\|")
            
            markdown_output += f"| {table_id} | {display_name} | {description} | {entity_type} |\n"
        
        return markdown_output
        
    except Exception as e:
        logger.error(f"Error listing tables for database {database_id}: {e}")
        raise


@mcp.tool
async def get_table_fields(table_id: int, limit: int = 20) -> dict[str, Any]:
    """Get all fields/columns in a table
    
    Args:
        table_id: The ID of the table
        limit: Maximum number of fields to return (default: 20)
    """
    try:
        result = await metabase_client.request("GET", f"/table/{table_id}/query_metadata")
        
        # Apply field limiting if limit > 0 and there are more fields than the limit
        if limit > 0 and "fields" in result and len(result["fields"]) > limit:
            total_fields = len(result["fields"])
            result["fields"] = result["fields"][:limit]
            result["_truncated"] = True
            result["_total_fields"] = total_fields
            result["_limit_applied"] = limit
        
        return result
    except Exception as e:
        logger.error(f"Error getting table fields for table {table_id}: {e}")
        raise


# Cleanup handler
async def cleanup():
    """Clean up resources on shutdown"""
    await metabase_client.close()


def main():
    """Main entry point for the server"""
    try:
        # Support multiple transport methods
        import sys

        # Get host and port from environment variables
        host = os.getenv("HOST", "0.0.0.0")
        port = int(os.getenv("PORT", "8000"))

        # Check for transport argument
        transport = "stdio"  # default
        if "--sse" in sys.argv:
            transport = "sse"
        elif "--http" in sys.argv:
            transport = "streamable-http"
        elif "--stdio" in sys.argv:
            transport = "stdio"

        logger.info(f"Starting Metabase MCP server with {transport} transport")

        if transport in ["sse", "streamable-http"]:
            logger.info(f"Server will be available at http://{host}:{port}")
            mcp.run(transport=transport, host=host, port=port)
        else:
            mcp.run(transport=transport)

    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise
    finally:
        asyncio.run(cleanup())


if __name__ == "__main__":
    main()
