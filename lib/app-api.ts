// Shared browser API deadline covers both headers and JSON body consumption.
// A timeout is an unknown write outcome, not proof that a financial action failed.
export async function api(path: string, init?: RequestInit, timeoutMs = 20000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  init?.signal?.addEventListener("abort", abort, { once: true });
  if (init?.signal?.aborted) controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Die versoek het te lank geneem. Die uitslag is nog onbekend; kontroleer die transaksie voordat jy weer betaal."));
    }, timeoutMs);
  });
  const headers = new Headers(init?.headers || {});
  if (!(init?.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json");
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetch(path, { ...init, credentials: "same-origin", signal: controller.signal, headers });
      const data = await response.json().catch((err) => {
        if (controller.signal.aborted) throw err;
        return { ok: false, error: "Die bediener het nie korrek geantwoord nie" };
      });
      if (!response.ok || data?.ok === false || data === null) {
        const message = data?.error || data?.reason || `Die bediener het HTTP ${response.status} teruggegee`;
        const suffix = data?.request_id ? ` Verwysing: ${data.request_id}` : "";
        throw new Error(`${message}${suffix}`);
      }
      return data;
    })()]);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("Die versoek is onderbreek. Kontroleer die transaksie se status voordat jy weer betaal.");
    throw err;
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener("abort", abort);
  }
}
