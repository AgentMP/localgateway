# localgateway
# AgentMP MCP Gateway

A local Node.js gateway that acts as a proxy to AgentMP MCP servers and A2A agents, allowing you to use them with Claude Desktop, Cursor, and other MCP-compatible tools.

## Features

- **Single Local Endpoint**: Configure one localhost URL for all your AgentMP services
- **Automatic Authentication**: Adds Bearer token authentication to all requests
- **MCP Server Support**: Proxy to multiple MCP servers on AgentMP platform
- **A2A Agent Support**: Interact with A2A agents through JSON-RPC 2.0
- **Easy Configuration**: Simple JSON configuration file
- **Hot Reload**: Reload configuration without restarting the server
- **Health Monitoring**: Built-in health checks and logging

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:
```bash
AGENTMP_API_KEY=your_api_key_here
PORT=12345
```

### 3. Configure Services

Edit `config.json` to add your MCP servers and A2A agents:
```json
{
  "mcpServers": {
    "curated-discovery": "https://curateddiscovery-788757352670.us-west2.run.app",
    "my-custom-mcp": "https://my-custom-mcp-788757352670.us-west2.run.app"
  },
  "a2aAgents": {
    "portfolio-manager": "https://portfoliomanager.a2a.agentmp.io",
    "retirement-planner": "https://retirementplanneragent.a2a.agentmp.io"
  }
}
```

### 4. Start the Gateway

```bash
npm start
```

The gateway will be available at `http://localhost:12345`

## Usage

### With Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "agentmp-curated-discovery": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-fetch"],
      "env": {
        "FETCH_BASE_URL": "http://localhost:12345/mcp/curated-discovery"
      }
    },
    "agentmp-portfolio-manager": {
      "command": "npx", 
      "args": ["@modelcontextprotocol/server-fetch"],
      "env": {
        "FETCH_BASE_URL": "http://localhost:12345/a2a/portfolio-manager"
      }
    }
  }
}
```

### With Cursor

Configure Cursor to use:
- MCP servers: `http://localhost:12345/mcp/{server-name}/`
- A2A agents: `http://localhost:12345/a2a/{agent-name}/`

### Direct API Access

You can also use the gateway directly via HTTP:

```bash
# Access MCP server
curl http://localhost:12345/mcp/curated-discovery/some-endpoint

# Access A2A agent
curl http://localhost:12345/a2a/portfolio-manager/some-endpoint
```

## API Endpoints

### Service Endpoints
- **MCP Servers**: `GET|POST /mcp/{serverName}/*`
- **A2A Agents**: `GET|POST /a2a/{agentName}/*`

### Management Endpoints
- **Health Check**: `GET /health`
- **Configuration**: `GET /config`
- **Reload Config**: `POST /config/reload`
- **Root Info**: `GET /`

## Configuration Management

### Adding New Services

1. Edit `config.json`:
```json
{
  "mcpServers": {
    "new-server": "https://new-server-788757352670.us-west2.run.app"
  },
  "a2aAgents": {
    "new-agent": "https://newagent.a2a.agentmp.io"
  }
}
```

2. Reload configuration:
```bash
curl -X POST http://localhost:12345/config/reload
```

### Dynamic Configuration

You can reload the configuration without restarting:

```bash
# Check current configuration
curl http://localhost:12345/config

# Reload after editing config.json
curl -X POST http://localhost:12345/config/reload
```

## URL Structure

### MCP Servers
```
Local:  http://localhost:12345/mcp/curated-discovery/endpoint
Remote: https://curateddiscovery-788757352670.us-west2.run.app/endpoint
```

### A2A Agents
```
Local:  http://localhost:12345/a2a/portfolio-manager/endpoint  
Remote: https://portfoliomanager.a2a.agentmp.io/endpoint
```

## Authentication

The gateway automatically adds the `Authorization: Bearer {AGENTMP_API_KEY}` header to all requests to your AgentMP services. Make sure your API key has access to all configured services.

## Monitoring

### Health Check
```bash
curl http://localhost:12345/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-05T10:30:00.000Z",
  "port": 12345,
  "configuredServers": ["curated-discovery"],
  "configuredAgents": ["portfolio-manager", "retirement-planner"]
}
```

### Logs

The gateway provides detailed logging for all requests:

```
🔄 MCP Proxy [curated-discovery]: GET /mcp/curated-discovery/status -> https://curateddiscovery-788757352670.us-west2.run.app/status
✅ MCP Response [curated-discovery]: 200
🤖 A2A Proxy [portfolio-manager]: POST /a2a/portfolio-manager/analyze -> https://portfoliomanager.a2a.agentmp.io/analyze
✅ A2A Response [portfolio-manager]: 200
```

## Troubleshooting

### Common Issues

1. **API Key Missing**: Ensure `AGENTMP_API_KEY` is set in `.env`
2. **Service Not Found**: Check service name in `config.json` matches URL path
3. **Authentication Failed**: Verify API key has access to the service
4. **Port In Use**: Change `PORT` in `.env` file

### Error Responses

The gateway provides helpful error messages:

```json
{
  "error": "MCP server 'unknown-server' not found in configuration",
  "availableServers": ["curated-discovery", "my-other-mcp"]
}
```

## Development

### Development Mode
```bash
npm run dev
```

Uses nodemon for automatic restarts on file changes.

### Adding Features

The gateway is built with Express.js and uses `http-proxy-middleware` for proxying. You can extend it by:

1. Adding new middleware in `server.js`
2. Creating new route handlers
3. Extending the configuration schema

## License

MIT License - see LICENSE file for details.