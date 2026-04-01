import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { registerResources } from './resources.js';
import { registerTools } from './tools.js';

function createServer(): McpServer {
  const server = new McpServer({
    name: 'jambonz-webrtc-sdk',
    version: '0.1.0',
  });

  registerResources(server);
  registerTools(server);

  return server;
}

async function startStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('jambonz WebRTC MCP server running on stdio');
}

async function startHttp(port: number) {
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  app.get('/mcp', async (req, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST for MCP requests.' },
      id: null,
    }));
  });

  app.delete('/mcp', async (req, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    }));
  });

  app.listen(port, () => {
    console.log(`jambonz WebRTC MCP server listening on http://0.0.0.0:${port}/mcp`);
  });
}

// Determine transport mode from args or env
const args = process.argv.slice(2);
const httpMode = args.includes('--http');
const portArgIdx = args.indexOf('--port');
const port = portArgIdx !== -1 && args[portArgIdx + 1]
  ? parseInt(args[portArgIdx + 1], 10)
  : parseInt(process.env.PORT || '3000', 10);

if (httpMode) {
  startHttp(port);
} else {
  startStdio();
}
