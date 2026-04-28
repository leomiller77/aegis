{
  "name": "aegis",
  "version": "1.0.0",
  "description": "AI workflow harness — spec-driven autonomous coding loop",
  "namespace": "aegis",
  "commands": [
    {
      "name": "spec",
      "trigger": "/aegis:spec",
      "description": "Generate or update anti-corruption layer specs in .aegis/specs/",
      "parameters": {
        "input": {
          "type": "string",
          "description": "Path to requirements document or inline requirement text",
          "required": true
        }
      },
      "systemPrompt": {
        "file": "prompts/spec.txt"
      },
      "allowedPaths": [".aegis/specs/**"],
      "deniedPaths": ["src/**", "lib/**", "app/**"]
    },
    {
      "name": "run",
      "trigger": "/aegis",
      "description": "Ignite autonomous coding loop for a single atomic task",
      "parameters": {
        "input": {
          "type": "string",
          "description": "Natural language task description",
          "required": true
        }
      },
      "systemPrompt": {
        "file": "prompts/exec.txt"
      },
      "hooks": {
        "onOutputMatch": {
          "pattern": "^\\[AEGIS_SUCCESS\\]$",
          "script": "hook.js"
        }
      },
      "autoApprove": false
    },
    {
      "name": "clear",
      "trigger": "/aegis:clear",
      "description": "Force-interrupt the active task loop and reset to idle",
      "parameters": {},
      "script": "scripts/clear.js"
    },
    {
      "name": "status",
      "trigger": "/aegis:status",
      "description": "Display system health snapshot",
      "parameters": {},
      "internalCommand": "aegis _internal-status",
      "script": "scripts/status.js"
    }
  ],
  "hooks": {
    "afterInit": "scripts/scaffold.js"
  }
}
