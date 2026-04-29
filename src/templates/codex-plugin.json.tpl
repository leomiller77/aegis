{
  "name": "omin",
  "version": "1.0.0",
  "description": "AI workflow harness — spec-driven autonomous coding loop",
  "namespace": "omin",
  "commands": [
    {
      "name": "spec",
      "trigger": "/omin:spec",
      "description": "Generate or update anti-corruption layer specs in .omin/specs/",
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
      "allowedPaths": [".omin/specs/**"],
      "deniedPaths": ["src/**", "lib/**", "app/**"]
    },
    {
      "name": "run",
      "trigger": "/omin",
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
          "pattern": "^\\[OMIN_SUCCESS\\]$",
          "script": "hook.js"
        }
      },
      "autoApprove": false
    },
    {
      "name": "clear",
      "trigger": "/omin:clear",
      "description": "Force-interrupt the active task loop and reset to idle",
      "parameters": {},
      "script": "scripts/clear.js"
    },
    {
      "name": "status",
      "trigger": "/omin:status",
      "description": "Display system health snapshot",
      "parameters": {},
      "internalCommand": "omin _internal-status",
      "script": "scripts/status.js"
    }
  ],
  "hooks": {
    "afterInit": "scripts/scaffold.js"
  }
}
