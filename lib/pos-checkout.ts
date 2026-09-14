export type CheckoutDraft = {
  event_id?: number;
  group_id?: number;
  location_id: number;
  terminal_code: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_mobile: string | null;
  wallet_id: string | null;
  items: Array<{ product_id: number; qty: number }>;
  method: string;
  provider_reference: string | null;
  // Cashier acknowledgement only; this is not provider verification.
  manual_card_confirmed?: boolean;
};
type Journal = { key: string; draft: CheckoutDraft; cancelReason?: string; webposStarted?: boolean };
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Api = (path: string, init: { method: string; body?: string }) => Promise<{
  order?: { id: number; order_code: string; total_cents?: number };
  status?: string;
  redirect_url?: string;
  yoco_payment?: { id?: string; redirect_url?: string };
}>;

export function webPOSFrameUrl(url: unknown, paymentId: unknown): string | null {
  if (typeof url !== 'string' || typeof paymentId !== 'string' || !paymentId) return null;
  try {
    const parsed = new URL(url);
    // Only the host/path published in the Yoco Web POS response example.
    // Expand for sandbox only after verifying the provider's actual URL.
    if (parsed.origin !== 'https://cpw.yoco.com' || parsed.username || parsed.password ||
        parsed.pathname !== `/redirect/payments/${encodeURIComponent(paymentId)}`) return null;
    return parsed.href;
  } catch { return null; }
}

export class PendingWebPOS extends Error {
  redirectUrl: string | null;
  constructor(message: string, redirectUrl: string | null = null) {
    super(message);
    this.name = 'PendingWebPOS';
    this.redirectUrl = redirectUrl;
  }
}

// This is a device-local recovery journal, never an authoritative payment record.
export function createCheckout(storage: Storage, scope: string, api: Api) {
  const storageKey = `skou-pos-pending:${scope}`;
  let running = false;
  function pending(): Journal | null {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const journal = JSON.parse(raw) as Journal;
    if (!journal.key || !journal.draft?.terminal_code || !Array.isArray(journal.draft.items)) {
      throw new Error('Die gestoorde verkoop kon nie gelees word nie. Kontak admin voordat jy weer betaal.');
    }
    return journal;
  }
  async function run(draft: CheckoutDraft | null, lease: Record<string, unknown>) {
    if (running) throw new Error('Die verkoop word reeds verwerk.');
    running = true;
    try {
      let journal = pending();
      if (journal?.cancelReason) throw new Error('Bevestig eers die kansellasie van hierdie verkoop.');
      if (journal && draft && JSON.stringify(journal.draft) !== JSON.stringify(draft)) {
        throw new Error('Hervat eers die vorige verkoop voordat jy ’n nuwe verkoop begin.');
      }
      if (!journal) {
        if (!draft) throw new Error('Geen verkoop om te hervat nie.');
        if (draft.method === 'yoco_manual' && (draft.manual_card_confirmed !== true || !draft.provider_reference?.trim())) {
          throw new Error('Bevestig eers die suksesvolle betaling op die Yoco-toestel en vul die transaksieverwysing in.');
        }
        journal = { key: crypto.randomUUID(), draft };
        // Storage failure must happen before any financial request.
        storage.setItem(storageKey, JSON.stringify(journal));
      }
      const saved = journal.draft;
      if (saved.terminal_code !== lease.terminal_code) throw new Error('Hervat hierdie verkoop op die oorspronklike terminal.');
      const { method, provider_reference, manual_card_confirmed: _manualConfirmation, ...orderDraft } = saved;
      const common = { ...lease, event_id: saved.event_id, group_id: saved.group_id, location_id: saved.location_id, terminal_code: saved.terminal_code };
      const result = await api('/api/pos-v1/orders', { method: 'POST', body: JSON.stringify({ ...orderDraft, ...common, idempotency_key: `${saved.terminal_code}:app-order:${journal.key}` }) });
      const order = result.order;
      if (!order?.id) throw new Error('Die verkoop se bestelling kon nie bevestig word nie. Probeer hervat.');
      if (method === 'yoco_webpos') {
        let payment;
        if (journal.webposStarted) {
          // A lost start response must never submit another provider charge.
          payment = await api(`/api/pos-v1/orders/${order.id}/yoco/status`, { method: 'GET' });
        } else {
          journal.webposStarted = true;
          storage.setItem(storageKey, JSON.stringify(journal));
          payment = await api(`/api/pos-v1/orders/${order.id}/yoco/start`, { method: 'POST', body: JSON.stringify(common) });
        }
        if (payment.status !== 'successful') {
          const url = payment.status === 'pending' ? webPOSFrameUrl(payment.redirect_url || payment.yoco_payment?.redirect_url, payment.yoco_payment?.id) : null;
          throw new PendingWebPOS(payment.status === 'failed'
            ? 'Yoco meld dat die betaling misluk het. Kanselleer die onbetaalde verkoop voordat jy weer probeer.'
            : url ? 'Voltooi die betaling hieronder en kies Kontroleer betaling.'
            : 'Betaling is nog nie bevestig nie. Kontroleer weer; moenie ’n tweede betaling neem nie.', url);
        }
      } else {
        await api(`/api/pos-v1/orders/${order.id}/pay`, { method: 'POST', body: JSON.stringify({ ...common, method, provider_reference, idempotency_key: `${saved.terminal_code}:app-pay:${order.id}:${journal.key}` }) });
      }
      await api(`/api/pos-v1/orders/${order.id}/fulfil`, { method: 'POST', body: JSON.stringify({ ...common, all_delivered: true }) });
      storage.removeItem(storageKey);
      return order;
    } finally {
      running = false;
    }
  }
  async function cancel(reason: string, lease: Record<string, unknown>) {
    if (running) throw new Error('Die verkoop word reeds verwerk.');
    running = true;
    try {
      const journal = pending();
      if (!journal) throw new Error('Geen verkoop om te kanselleer nie.');
      if (journal.draft.terminal_code !== lease.terminal_code) throw new Error('Kanselleer hierdie verkoop op die oorspronklike terminal.');
      const savedReason = journal.cancelReason || reason.trim();
      if (!savedReason || savedReason.length > 500) throw new Error('Verskaf ’n rede van hoogstens 500 karakters.');
      // Persist intent before sending anything: after an uncertain cancellation,
      // resume must not accidentally submit another payment.
      journal.cancelReason = savedReason;
      storage.setItem(storageKey, JSON.stringify(journal));
      const saved = journal.draft;
      const common = { ...lease, event_id: saved.event_id, group_id: saved.group_id, location_id: saved.location_id, terminal_code: saved.terminal_code };
      const result = await api('/api/pos-v1/orders', { method: 'POST', body: JSON.stringify({ ...saved, ...common, idempotency_key: `${saved.terminal_code}:app-order:${journal.key}` }) });
      if (!result.order?.id) throw new Error('Die bestelling kon nie bevestig word nie. Probeer kanselleer weer.');
      try {
        await api(`/api/pos-v1/orders/${result.order.id}/cancel`, { method: 'POST', body: JSON.stringify({ ...common, reason: savedReason }) });
      } catch (err) {
        // A definitive refusal must not trap an already-started WebPOS payment
        // behind cancellation intent. Resume is status-only for this journal.
        // Network/unknown errors still retain intent until cancellation is known.
        if (journal.draft.method === 'yoco_webpos' && journal.webposStarted === true &&
            err instanceof Error && /^(?:cannot_cancel_paid_or_changed_order|yoco_payment_reconciliation_required)(?:$| Verwysing:)/.test(err.message)) {
          delete journal.cancelReason;
          storage.setItem(storageKey, JSON.stringify(journal));
          throw new Error('Kansellasie is nie toegelaat nie. Kontroleer die bestaande Yoco-betaling; moenie weer hef nie.');
        }
        // Only a definitive paid response releases the cancellation intent.
        // Keep the original keys so resume completes the paid order, not a new sale.
        if (err instanceof Error && /^cannot_cancel_paid_order(?:$| Verwysing:)/.test(err.message)) {
          delete journal.cancelReason;
          storage.setItem(storageKey, JSON.stringify(journal));
          throw new Error('Hierdie verkoop is reeds betaal. Hervat die vorige verkoop om dit te voltooi; gebruik daarna die terugbetalingsopsie indien nodig.');
        }
        throw err;
      }
      storage.removeItem(storageKey);
      return result.order;
    } finally { running = false; }
  }
  return { pending, run, cancel };
}
