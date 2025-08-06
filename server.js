const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 12345;
const API_KEY = process.env.AGENTMP_API_KEY;

if (!API_KEY) {
  console.error('❌ AGENTMP_API_KEY environment variable is required');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Load configuration
let config = {};
const configPath = path.join(__dirname, 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
      console.log('📋 Loaded configuration:', Object.keys(config));
    } else {
      console.log('⚠️  No config.json found. Creating default configuration...');
      createDefaultConfig();
    }
  } catch (error) {
    console.error('❌ Error loading configuration:', error.message);
    createDefaultConfig();
  }
}

function createDefaultConfig() {
  const defaultConfig = {
    mcpServers: {
      "curated-discovery": "https://curateddiscovery-788757352670.us-west2.run.app"
    },
    a2aAgents: {
      "portfolio-manager": "https://portfoliomanager.a2a.agentmp.io",
      "retirement-planner": "https://retirementplanneragent.a2a.agentmp.io"
    }
  };
  
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  config = defaultConfig;
  console.log('✅ Created default config.json');
}

// Load initial configuration
loadConfig();

// MCP Server proxy routes
app.use('/mcp/:serverName/*', (req, res, next) => {
  const serverName = req.params.serverName;
  const targetUrl = config.mcpServers?.[serverName];
  
  if (!targetUrl) {
    return res.status(404).json({
      error: `MCP server '${serverName}' not found in configuration`,
      availableServers: Object.keys(config.mcpServers || {})
    });
  }

  // Create proxy middleware with authentication
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^/mcp/${serverName}`]: '', // Remove the /mcp/serverName prefix
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add authentication header
      proxyReq.setHeader('Authorization', `Bearer ${API_KEY}`);
      
      // Log the request
      console.log(`🔄 MCP Proxy [${serverName}]: ${req.method} ${req.originalUrl} -> ${targetUrl}${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`✅ MCP Response [${serverName}]: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ MCP Proxy Error [${serverName}]:`, err.message);
      res.status(500).json({
        error: 'Proxy error',
        message: err.message,
        server: serverName
      });
    }
  });

  proxy(req, res, next);
});

// A2A Agent proxy routes
app.use('/a2a/:agentName/*', (req, res, next) => {
  const agentName = req.params.agentName;
  const targetUrl = config.a2aAgents?.[agentName];
  
  if (!targetUrl) {
    return res.status(404).json({
      error: `A2A agent '${agentName}' not found in configuration`,
      availableAgents: Object.keys(config.a2aAgents || {})
    });
  }

  // Create proxy middleware with authentication
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^/a2a/${agentName}`]: '', // Remove the /a2a/agentName prefix
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add authentication header
      proxyReq.setHeader('Authorization', `Bearer ${API_KEY}`);
      
      // Log the request
      console.log(`🤖 A2A Proxy [${agentName}]: ${req.method} ${req.originalUrl} -> ${targetUrl}${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`✅ A2A Response [${agentName}]: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ A2A Proxy Error [${agentName}]:`, err.message);
      res.status(500).json({
        error: 'Proxy error',
        message: err.message,
        agent: agentName
      });
    }
  });

  proxy(req, res, next);
});

// Health check and info endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    configuredServers: Object.keys(config.mcpServers || {}),
    configuredAgents: Object.keys(config.a2aAgents || {})
  });
});

app.get('/config', (req, res) => {
  res.json({
    mcpServers: Object.keys(config.mcpServers || {}),
    a2aAgents: Object.keys(config.a2aAgents || {}),
    endpoints: {
      mcp: Object.keys(config.mcpServers || {}).map(name => `http://localhost:${PORT}/mcp/${name}/`),
      a2a: Object.keys(config.a2aAgents || {}).map(name => `http://localhost:${PORT}/a2a/${name}/`)
    }
  });
});

// Configuration management endpoints
app.post('/config/reload', (req, res) => {
  try {
    loadConfig();
    res.json({
      success: true,
      message: 'Configuration reloaded',
      mcpServers: Object.keys(config.mcpServers || {}),
      a2aAgents: Object.keys(config.a2aAgents || {})
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root endpoint with usage information
app.get('/', (req, res) => {
  res.json({
    name: 'AgentMP MCP Gateway',
    version: '1.0.0',
    description: 'Local gateway for AgentMP MCP servers and A2A agents',
    usage: {
      mcpServers: `http://localhost:${PORT}/mcp/{serverName}/`,
      a2aAgents: `http://localhost:${PORT}/a2a/{agentName}/`,
      availableServers: Object.keys(config.mcpServers || {}),
      availableAgents: Object.keys(config.a2aAgents || {}),
      healthCheck: `http://localhost:${PORT}/health`,
      configuration: `http://localhost:${PORT}/config`
    },
    setup: {
      environment: 'Set AGENTMP_API_KEY in .env file',
      configuration: 'Edit config.json to add/remove servers and agents',
      port: 'Set PORT in .env file (default: 12345)'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 AgentMP MCP Gateway Started');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('\n📋 Available Services:');
  
  if (config.mcpServers) {
    console.log('\n🔧 MCP Servers:');
    Object.entries(config.mcpServers).forEach(([name, url]) => {
      console.log(`  • ${name}: http://localhost:${PORT}/mcp/${name}/`);
    });
  }
  
  if (config.a2aAgents) {
    console.log('\n🤖 A2A Agents:');
    Object.entries(config.a2aAgents).forEach(([name, url]) => {
      console.log(`  • ${name}: http://localhost:${PORT}/a2a/${name}/`);
    });
  }
  
  console.log(`\n📖 Documentation: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`⚙️  Configuration: http://localhost:${PORT}/config`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down AgentMP MCP Gateway...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down AgentMP MCP Gateway...');
  process.exit(0);
});