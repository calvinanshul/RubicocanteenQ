import { after } from 'next/server';

/**
 * Runs `task` after the response is sent, without delaying it. Inside a Next.js request this uses `after()`,
 * which on Vercel keeps the serverless function alive until the task settles (a bare `void task()` can be
 * frozen once the response is out, so the email would never leave). Outside a request scope (the in-process
 * API tests) `after()` throws, and the task simply runs in the background.
 */
export function runAfterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}
