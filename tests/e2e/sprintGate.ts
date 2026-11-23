import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Same rule as backend/tests/sprintGate.ts: a sprint's E2E scripts run once the sprint has started. */
export function sprintActive(n: number): boolean {
  if (process.env.SPRINT_TESTS === 'all') return true;
  const id = String(n).padStart(2, '0');
  const row = readFileSync(fileURLToPath(new URL('../../docs/sprints/STATUS.md', import.meta.url)), 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`| ${id} |`));
  return (row?.split('|')[3]?.trim() ?? 'not started') !== 'not started';
}
