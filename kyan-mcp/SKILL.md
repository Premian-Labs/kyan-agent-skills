---
name: kyan-mcp
description: Configure and use Kyan.blue MCP server for AI agent access to derivatives trading APIs. Setup guides for Claude Code, Claude Desktop, and Cursor/Windsurf.
version: 1.0.0
---

# Kyan MCP Server

The Kyan MCP server provides AI agents with direct access to the Kyan.blue derivatives trading exchange APIs and documentation. Through 9 MCP tools, agents can explore API specifications, read documentation, generate code snippets, and execute live API calls.

## MCP Server Overview

- **Server URL:** `https://docs.kyan.blue/mcp`
- **Transport:** Streamable HTTP
- **Authentication:** `x-apikey` header (optional for read-only operations, required for trading)

The server exposes both API specification tools (for exploring and understanding endpoints) and documentation tools (for reading guides and conceptual content). No authentication is needed to browse the API or read docs. An API key is only required when executing live requests via `execute-request`.

## Available MCP Tools

The Kyan MCP server provides 9 tools organized into three categories.

### API Specification Tools

1. **list-endpoints** -- Enumerate all REST API paths with their HTTP methods and summaries. Use this as your starting point to discover what the API offers. Returns a list of every available endpoint.

2. **get-endpoint** -- Retrieve full details for a specific endpoint: parameters, authentication requirements, description, and metadata. Provide the HTTP method and path (e.g., `GET /v1/orderbook`).

3. **get-request-body** -- Access the request body schema for any endpoint that accepts a body (POST, PUT, PATCH). Returns field names, types, required/optional status, and descriptions.

4. **get-response-schema** -- Retrieve the response schema for a specific endpoint and HTTP status code. Use this to understand what data comes back from an API call.

5. **search-specs** -- Search across API paths, operation IDs, and schemas. Use this for API-specific queries like finding endpoints related to "orders" or "positions."

6. **execute-request** -- Execute live API calls against staging or production environments. Requires an API key configured via the `x-apikey` header. Supports all HTTP methods and handles request serialization.

7. **get-code-snippet** -- Generate working code snippets for any endpoint in multiple languages including TypeScript, Python, Go, and others. Useful for quickly integrating Kyan APIs into applications.

### Documentation Tools

8. **search** -- Full-text search across all Kyan documentation pages. Use this for conceptual queries like "how does margin work" or "liquidation process." Returns matching page titles and snippets.

9. **fetch** -- Read the complete content of a specific documentation guide page. Use after `search` to retrieve the full text of a relevant page.

## Setup Instructions

### Claude Code

Run the install script or execute the command directly in your terminal:

```bash
# Basic setup (read-only access)
claude mcp add kyan --transport streamable-http https://docs.kyan.blue/mcp

# With API key authentication (enables trading)
claude mcp add kyan --transport streamable-http --header "x-apikey:YOUR_API_KEY" https://docs.kyan.blue/mcp
```

The install script is also available at `configs/claude-code.sh`.

**Verification:** After adding, run `claude mcp list` and confirm `kyan` appears with the streamable-http transport. Then in a conversation, ask Claude to call `list-endpoints` to verify the connection.

### Claude Desktop

Edit the Claude Desktop configuration file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Basic configuration (read-only):

```json
{
  "mcpServers": {
    "kyan": {
      "url": "https://docs.kyan.blue/mcp"
    }
  }
}
```

With API key authentication (enables trading):

```json
{
  "mcpServers": {
    "kyan": {
      "url": "https://docs.kyan.blue/mcp",
      "headers": {
        "x-apikey": "YOUR_API_KEY"
      }
    }
  }
}
```

A reference config file is available at `configs/claude-desktop.json`.

**Verification:** Restart Claude Desktop after saving the config. Open a new conversation and look for the Kyan MCP tools in the tools list. Ask Claude to call `list-endpoints` to confirm connectivity.

### Cursor / Windsurf

Edit the MCP configuration file at `~/.cursor/mcp.json` (Cursor) or the equivalent Windsurf config location:

Basic configuration (read-only):

```json
{
  "mcpServers": {
    "kyan": {
      "url": "https://docs.kyan.blue/mcp"
    }
  }
}
```

With API key authentication (enables trading):

```json
{
  "mcpServers": {
    "kyan": {
      "url": "https://docs.kyan.blue/mcp",
      "headers": {
        "x-apikey": "YOUR_API_KEY"
      }
    }
  }
}
```

A reference config file is available at `configs/cursor.json`.

**Verification:** Restart Cursor/Windsurf after saving. Open the MCP tools panel and verify that the 9 Kyan tools are listed. Test by asking the agent to call `list-endpoints`.

## Usage Patterns

Common workflows for agents using the Kyan MCP tools:

### Discovering Available Endpoints

> "List all trading endpoints"

Call `list-endpoints` to get the full catalog of API paths. Filter results by scanning for keywords in the path or summary (e.g., `/v1/order`, `/v1/position`).

### Learning About a Specific Endpoint

> "Show me the orderbook schema"

1. Call `get-endpoint` with the method and path (e.g., `GET /v1/orderbook`) to get the endpoint description and parameters.
2. Call `get-response-schema` with the same method, path, and status code `200` to see the response structure.
3. Optionally call `get-request-body` if the endpoint accepts a request body.

This combination of all three tools gives a complete picture of any endpoint.

### Finding Documentation on a Topic

> "How do I place a limit order?"

1. Call `search` with a query like "limit order" to find relevant documentation pages.
2. Call `fetch` with the page path from the search results to read the full guide.

### Exploring the API Spec for a Concept

> "What endpoints relate to margin?"

Call `search-specs` with query "margin" to find all API paths, operations, and schemas that reference margin. This is more targeted than `search` because it operates on the OpenAPI specification rather than documentation prose.

### Generating Code

> "Generate Python code for placing an order"

Call `get-code-snippet` with the endpoint method, path, and target language (e.g., `python`). The tool returns a working code sample with proper imports, authentication handling, and request structure.

### Executing a Test Trade

> "Execute a test trade on staging"

Call `execute-request` with the full request details (method, path, body, and any query parameters). This tool requires an API key to be configured. It executes the request against the Kyan API and returns the response.

### Searching Documentation

> "Search for margin documentation"

Call `search` with the query "margin" to get a list of matching documentation pages with titles and context snippets. Then call `fetch` on any result to read the full content.

## Tips

- **search-specs vs search:** Use `search-specs` for API-specific queries (endpoints, schemas, parameters). Use `search` for documentation and conceptual queries (guides, tutorials, explanations). They search different content.
- **Rate limits:** `execute-request` respects all Kyan API rate limits. The tool will return rate limit errors if limits are exceeded.
- **Code snippets:** `get-code-snippet` supports multiple languages including TypeScript, Python, Go, Rust, and others. Specify the language when calling the tool.
- **Full endpoint understanding:** Combine `get-endpoint` + `get-request-body` + `get-response-schema` to build a complete understanding of any endpoint before generating code or making calls.
- **No auth for exploration:** You do not need an API key to browse endpoints, read documentation, search specs, or generate code snippets. Only `execute-request` requires authentication.
- **Start broad, then narrow:** Use `list-endpoints` or `search-specs` to find what you need, then drill into specifics with `get-endpoint` and related tools.
