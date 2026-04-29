import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export const log = {
  success: (msg: string) => console.log(chalk.green('✔ ' + msg)),
  warn: (msg: string) => console.log(chalk.yellow('⚠ ' + msg)),
  error: (msg: string) => console.log(chalk.red('✖ ' + msg)),
  info: (msg: string) => console.log(chalk.blue('ℹ ' + msg)),
  path: (p: string) => chalk.cyan(p),
  dim: (msg: string) => chalk.gray('· ' + msg),
  bold: (msg: string) => chalk.bold(msg),
  raw: (msg: string) => console.log(msg),
};

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan' }).start();
}

export function printBanner(subtitle: string): void {
  console.log(chalk.bold('┌─────────────────────────────────────────┐'));
  console.log(chalk.bold('│  Omin v1.0.0                            │'));
  console.log(chalk.bold(`│  ${subtitle.padEnd(38)}│`));
  console.log(chalk.bold('└─────────────────────────────────────────┘'));
  console.log();
}

export function printBox(lines: string[]): void {
  const width = 45;
  const border = '─'.repeat(width);
  console.log(chalk.bold(`┌${border}┐`));
  for (const line of lines) {
    const padded = line.padEnd(width);
    console.log(chalk.bold('│') + '  ' + padded.slice(0, width - 2) + chalk.bold('│'));
  }
  console.log(chalk.bold(`└${border}┘`));
}
