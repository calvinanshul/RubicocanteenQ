import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STATUS_FILE = fileURLToPath(new URL('../docs/sprints/STATUS.md', import.meta.url));

/** Status of sprint N from docs/sprints/STATUS.md ("not started", "in development", …). */
export function sprintStatus(n: number): string {
  const id = String(n).padStart(2, '0');
  const row = readFileSync(STATUS_FILE, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`| ${id} |`));
  return row?.split('|')[3]?.trim() ?? 'not started';
}

/**
 * Sprint acceptance scripts are written ahead of the code (from the API and UI specs).
 * They run once the sprint has started (any status except "not started"), or always with SPRINT_TESTS=all.
 */
export function sprintActive(n: number): boolean {
  return process.env.SPRINT_TESTS === 'all' || sprintStatus(n) !== 'not started';
}
