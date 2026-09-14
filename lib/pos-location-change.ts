type Lease = { terminal_code: string; device_instance_id: string; lease_token: string };

export function initialPOSContext(options: {
  pending: { draft: { location_id: number; terminal_code: string; event_id?: number } } | null;
  locationIds: number[];
  primaryLocationId?: number | null;
  eventId?: number;
}): { locationId: number; terminalCode?: string } {
  const draft = options.pending?.draft;
  if (draft) {
    if (!Number.isSafeInteger(draft.location_id) || draft.location_id < 1 || !options.locationIds.includes(draft.location_id) ||
        typeof draft.terminal_code !== 'string' || !draft.terminal_code.trim() ||
        (draft.event_id !== undefined && draft.event_id !== options.eventId)) {
      throw new Error("Die hangende verkoop se oorspronklike ligging of skou is nie beskikbaar nie. Kontak admin om dit te herstel; moenie weer betaal nie.");
    }
    return { locationId: draft.location_id, terminalCode: draft.terminal_code };
  }
  const primary = options.primaryLocationId;
  return { locationId: primary && options.locationIds.includes(primary) ? primary : options.locationIds[0] || 0 };
}

export async function changePOSLocation(options: {
  hasBasket: boolean;
  hasPendingSale: () => boolean;
  lease: Lease | null;
  release: (lease: Lease) => Promise<{ released?: boolean }>;
  clearLease: () => void;
  prepare: () => Promise<boolean>;
  select: () => void;
}) {
  if (options.hasBasket || options.hasPendingSale()) {
    throw new Error("Voltooi of kanselleer eers die huidige verkoop en maak die mandjie leeg voordat jy ligging verander.");
  }
  if (options.lease) {
    const result = await options.release(options.lease);
    if (result.released !== true) throw new Error("Die huidige POS-sessie kon nie vrygestel word nie. Herlaai die afdeling en probeer weer.");
    options.clearLease();
  }
  if (await options.prepare()) options.select();
}
