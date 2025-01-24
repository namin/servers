# Filesystem MCP Server

Node.js server implementing Model Context Protocol (MCP) for accessing io.livecode.ch repositories, but running them locally.

## Features

- Run a snippet within a context from an io.livecode.ch GitHub repository.

## API

### Tools

- **run_code**
  - Runs the main code in the context of pre and post code using the given user/repo from GitHub.
  - Inputs:
    - `main` (string): main code
    - `user` (string): username on Github
    - `repo` (string): repo under username on Github
    - `pre` (string): Optional pre code
    - `post` (string): Optional post code

## Usage with Claude Desktop
Add this to your `claude_desktop_config.json`:

Note: you can provide sandboxed directories to the server by mounting them to `/projects`. Adding the `ro` flag will make the directory readonly by the server.

### Docker
Note: all directories must be mounted to `/projects` by default.

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "docker",
      "args": [
        "run",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "-v", "/tmp/snippets:/tmp/snippets",
        "mcp/livecode"
      ]
    }
  }
}
```

## Build

Docker build:

```bash
docker build -t mcp/livecode -f src/livecode/Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
