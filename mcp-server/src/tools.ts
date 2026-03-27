import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buildSchemaIndex, getSchema, getAgentsGuide } from './resources.js';

export function registerTools(server: McpServer) {
  /**
   * Tool 1: jambonz_developer_toolkit
   *
   * Returns the full AGENTS.md guide plus an index of all available schemas.
   * This is the first tool an AI agent should call to understand the SDK.
   */
  server.tool(
    'jambonz_developer_toolkit',
    'Get the complete jambonz WebRTC client SDK developer guide (AGENTS.md) and an index of all available schemas. Call this first before building any WebRTC/softphone application.',
    {},
    async () => {
      const guide = getAgentsGuide();
      const index = buildSchemaIndex();

      return {
        content: [
          {
            type: 'text',
            text: [
              guide,
              '',
              '---',
              '',
              index,
              '',
              '---',
              '',
              'Use the `get_jambonz_schema` tool to fetch any individual schema by name.',
            ].join('\n'),
          },
        ],
      };
    }
  );

  /**
   * Tool 2: get_jambonz_schema
   *
   * Returns a specific schema by name. Supports prefixes like "component:audio-device"
   * or bare names like "client-options".
   */
  server.tool(
    'get_jambonz_schema',
    'Fetch a specific jambonz WebRTC SDK schema by name. Use prefixes for component schemas (e.g., "component:audio-device"). Root schemas: client-options, call-options, client-events, call-events, client-methods, call-methods, enums.',
    {
      name: z
        .string()
        .describe(
          'Schema name, optionally prefixed. Examples: "client-options", "call-events", "component:call-quality-stats", "component:audio-device"'
        ),
    },
    async ({ name }) => {
      const schema = getSchema(name);

      if (!schema) {
        const index = buildSchemaIndex();
        return {
          content: [
            {
              type: 'text',
              text: `Schema "${name}" not found.\n\n${index}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: schema,
          },
        ],
      };
    }
  );
}
