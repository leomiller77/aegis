export const SUCCESS_TOKEN = '[OMIN_SUCCESS]';

export function isSuccessLine(line: string): boolean {
  return line.trim() === SUCCESS_TOKEN;
}

export type SuccessCallback = () => void | Promise<void>;

export function createLineScanner(onSuccess: SuccessCallback) {
  return function scan(line: string): void {
    if (isSuccessLine(line)) {
      void Promise.resolve(onSuccess());
    }
  };
}
