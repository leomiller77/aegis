import { Milestone } from './state-writer.js';
import { ARCHIVE_PROMPT } from '../../prompts/archive.prompt.js';

export async function generateMilestone(
  taskContent: string,
  retries: number,
): Promise<Milestone> {
  void ARCHIVE_PROMPT;
  void taskContent;

  return {
    event: taskContent.split('\n')[0]?.slice(0, 100) ?? '任务已完成',
    timestamp: new Date().toISOString(),
    tags: ['feature'],
    retries,
  };
}
