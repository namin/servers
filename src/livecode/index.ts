#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from 'os';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { diffLines, createTwoFilesPatch } from 'diff';
import { minimatch } from 'minimatch';
import { DockerManager } from './docker.js';
import { snippetCache } from './utils.js';

const docker = new DockerManager();

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions for MCP
const RunCodeArgsSchema = z.object({
  user: z.string(),
  repo: z.string(),
  main: z.string(),
  pre: z.string().optional(),
  post: z.string().optional(),
  image: z.string().optional(),
});

// Server setup
const server = new Server(
  {
    name: "livecode-server",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool implementations

async function runCode(args: z.infer<typeof RunCodeArgsSchema>) {
  const img = docker.getImageName(args.user, args.repo, args.image || '');
  
  const keyMain = snippetCache(args.main);
  const keyPre = snippetCache(args.pre || '');
  const keyPost = snippetCache(args.post || '');
  
  await docker.ensureImage(args.user, args.repo);
  return await docker.runContainer(img, `livecode-run ${keyMain} ${keyPre} ${keyPost}`);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "run_code",
        description:
          "Run a snippet within a context from an io.livecode.ch GitHub repository.",
        inputSchema: zodToJsonSchema(RunCodeArgsSchema) as ToolInput,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
      if (request.params.name !== 'run_code') {
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
      const parsed = RunCodeArgsSchema.safeParse(request.params.arguments);
      if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error}`);
      }

      const result = await runCode(parsed.data);
    
      if (result.status === 137) {
          throw new Error("Process killed");
      } else if (result.status === 125) {
          throw new Error("Process timeout");
      } else if (result.status === 124) {
          throw new Error("Infinite loop detected");
      }
    
      return {
          content: [{ type: "text", text: result.output }],
      };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("io.livecode.ch Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
