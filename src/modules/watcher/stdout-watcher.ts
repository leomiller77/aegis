import { spawn, type ChildProcess } from 'child_process';
import { createInterface } from 'readline';
import { createLineScanner, type SuccessCallback } from './line-scanner.js';

export function startWatcher(
  hostCommand: string,
  args: string[],
  onSuccess: SuccessCallback,
): ChildProcess {
  const child = spawn(hostCommand, args, {
    stdio: ['inherit', 'pipe', 'inherit'],
    shell: false,
  });

  const scanner = createLineScanner(onSuccess);
  const rl = createInterface({ input: child.stdout! });

  rl.on('line', (line: string) => {
    process.stdout.write(line + '\n');
    scanner(line);
  });

  child.on('exit', (_code) => {
    rl.close();
  });

  return child;
}
