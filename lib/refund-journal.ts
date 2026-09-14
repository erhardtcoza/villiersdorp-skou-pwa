export type RefundDraft = { amount_cents: number; method: string; reason: string; processing_shift_id?: string | null };
export type PendingRefund = { orderId: number; key: string; draft: RefundDraft };
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
type RefundReceipt = { status?: string; pos_order_id?: unknown; idempotency_key?: unknown; actor_subject_type?: unknown; actor_subject_id?: unknown; processing_shift_id?: unknown; amount_cents?: unknown; method?: unknown; reason?: unknown };

export function refundOutcome(status?: string): { terminal: boolean; failed: boolean; message: string } {
  if (status === "completed") return { terminal: true, failed: false, message: "Refund is voltooi en die transaksie is opgedateer." };
  if (status === "failed_provider") return { terminal: true, failed: true, message: "Yoco het bevestig dat die refund misluk het. Geen terugbetaling is vir hierdie versoek voltooi nie. Kontroleer die transaksie voordat jy ’n nuwe refund aanvra, of kontak admin." };
  return { terminal: false, failed: false, message: "Yoco het nog nie finaal bevestig nie. Die oorspronklike versoek bly gestoor; hervat dit of kontak admin." };
}

// Device-local recovery only; the backend remains authoritative for money/rights.
export function createRefundJournal<T extends { refund?: RefundReceipt }>(
  storage: Storage, scope: string,
  api: (path: string, init: RequestInit) => Promise<T>,
) {
  const storageKey = `skou-refund-pending:${scope}`;
  let running = false;
  const validShift = (value: unknown) => value == null || (typeof value === "string" && Boolean(value.trim()) && value.length <= 128);
  function pending(): PendingRefund | null {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const saved = JSON.parse(raw) as PendingRefund;
    if (!Number.isSafeInteger(saved.orderId) || saved.orderId <= 0 || !saved.key ||
        !Number.isSafeInteger(saved.draft?.amount_cents) || saved.draft.amount_cents <= 0 ||
        !["wallet", "card"].includes(saved.draft.method) || typeof saved.draft.reason !== "string" || saved.draft.reason.trim().length < 3 || !validShift(saved.draft.processing_shift_id)) {
      throw new Error("Die gestoorde refund kon nie gelees word nie. Kontak admin voordat jy weer probeer.");
    }
    return saved;
  }
  async function run(orderId: number, draft: RefundDraft | null): Promise<T> {
    if (running) throw new Error("Die refund word reeds verwerk.");
    running = true;
    try {
      let saved = pending();
      if (saved && (saved.orderId !== orderId || (draft && JSON.stringify(saved.draft) !== JSON.stringify(draft)))) {
        throw new Error("Hervat eers die vorige refund met die oorspronklike besonderhede.");
      }
      if (!saved) {
        if (!draft || !Number.isSafeInteger(orderId) || orderId <= 0 ||
            !Number.isSafeInteger(draft.amount_cents) || draft.amount_cents <= 0 ||
            !["wallet", "card"].includes(draft.method) || draft.reason.trim().length < 3 || !validShift(draft.processing_shift_id)) throw new Error("Refund besonderhede is ongeldig.");
        saved = { orderId, key: crypto.randomUUID(), draft: { ...draft } };
        // Failure to persist must prevent a financial request.
        storage.setItem(storageKey, JSON.stringify(saved));
      }
      const result = await api(`/api/app/bar/transactions/${saved.orderId}/refund`, {
        method: "POST", body: JSON.stringify({ ...saved.draft, idempotency_key: saved.key }),
      });
      // Another mounted panel may have replaced the device-local journal while
      // this request was in flight. Never clear that panel's financial intent.
      if (JSON.stringify(pending()) !== JSON.stringify(saved)) throw new Error("Die gestoorde refund het verander. Herlaai en hervat die oorspronklike versoek; kontak admin indien nodig.");
      if (refundOutcome(result.refund?.status).terminal) {
        const receipt = result.refund!;
        if (receipt.pos_order_id !== saved.orderId || receipt.idempotency_key !== saved.key ||
            `${receipt.actor_subject_type}:${receipt.actor_subject_id}` !== scope ||
            receipt.amount_cents !== saved.draft.amount_cents || receipt.method !== saved.draft.method ||
            receipt.reason !== saved.draft.reason || !Object.hasOwn(receipt, 'processing_shift_id') ||
            receipt.processing_shift_id !== (saved.draft.processing_shift_id ?? null)) {
          throw new Error("Die refund-ontvangsbewys pas nie by die gestoorde versoek nie. Hervat die oorspronklike versoek of kontak admin; moenie ’n nuwe refund skep nie.");
        }
        storage.removeItem(storageKey);
      }
      return result;
    } finally { running = false; }
  }
  return { pending, run };
}
