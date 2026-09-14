// Health probes are read-only and must have a deadline covering headers AND body.
export async function fetchHealthJson(
  url: string,
  transport: (request: Request) => Promise<Response>,
  timeoutMs = 8000,
  maxBytes = 65536,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      void reader?.cancel().catch(() => {});
      reject(new Error("Health check timed out."));
    }, timeoutMs);
  });
  const work = async () => {
    const response = await transport(new Request(url, {
      headers: { accept: "application/json" }, signal: controller.signal, redirect: "manual",
    }));
    if (controller.signal.aborted) {
      void response.body?.cancel().catch(() => {});
      throw new Error("Health check timed out.");
    }
    if (response.status >= 300 && response.status < 400) {
      void response.body?.cancel().catch(() => {});
      throw new Error("Health check returned a redirect.");
    }
    if (!response.body) throw new Error("Health check returned an empty response.");
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) throw new Error("Health response exceeded size limit.");
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return { ok: response.ok, status: response.status, body: JSON.parse(text) as unknown };
  };
  try {
    return await Promise.race([work(), deadline]);
  } finally {
    clearTimeout(timer);
    controller.abort();
    void reader?.cancel().catch(() => {});
  }
}
