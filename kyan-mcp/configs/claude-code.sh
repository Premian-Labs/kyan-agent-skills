#!/usr/bin/env bash
# Install Kyan MCP server for Claude Code
claude mcp add kyan --transport streamable-http https://docs.kyan.blue/mcp

# With API key authentication:
# claude mcp add kyan --transport streamable-http --header "x-apikey:YOUR_API_KEY" https://docs.kyan.blue/mcp
