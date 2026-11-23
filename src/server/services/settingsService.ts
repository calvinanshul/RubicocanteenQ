import type { Settings } from '@prisma/client';
import type { PublicSettings, SettingsInput } from '@/shared';
import { prisma } from '../db';

/** The single settings row (id = 1); created with defaults if missing. */
export async function getSettings(): Promise<Settings> {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export function allowedDomainsOf(settings: Pick<Settings, 'allowedDomains'>): string[] {
  return settings.allowedDomains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/** S1 response. `allowedDomains` is only returned to admins. */
export function toPublicSettings(s: Settings, includeDomains: boolean): PublicSettings {
  return {
    orderCutoff: s.orderCutoff,
    slotStart: s.slotStart,
    slotEnd: s.slotEnd,
    slotMinutes: s.slotMinutes,
    slotCapacity: s.slotCapacity,
    pickupLocation: s.pickupLocation,
    noShowGraceMinutes: s.noShowGraceMinutes,
    maxQtyPerItem: s.maxQtyPerItem,
    closedWeekdays: s.closedWeekdays,
    ...(includeDomains ? { allowedDomains: allowedDomainsOf(s) } : {}),
  };
}

/** S2: replace the settings (US-05). Existing orders keep their data; new rules apply to new orders (AC5). */
export async function saveSettings(input: SettingsInput, actorId: number): Promise<PublicSettings> {
  const before = await getSettings();
  const data = { ...input, allowedDomains: [...new Set(input.allowedDomains)].join(','), closedWeekdays: [...new Set(input.closedWeekdays)].sort() };
  const saved = await prisma.settings.update({ where: { id: 1 }, data });
  await prisma.auditLog.create({
    data: { actorId, action: 'SETTINGS_UPDATED', entity: 'Settings', entityId: 1, before: toPublicSettings(before, true) as object, after: toPublicSettings(saved, true) as object },
  });
  return toPublicSettings(saved, true);
}
