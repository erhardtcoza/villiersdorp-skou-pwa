"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function GateCamera({ onCode, disabled }: { onCode: (code: string) => void; disabled: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const stopResources = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  const stop = useCallback(() => { stopResources(); setActive(false); }, [stopResources]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); stopResources(); };
  }, [stop, stopResources]);
  const start = async () => {
    stopResources();
    const run = generation.current;
    setError("");
    setActive(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Kamera is nie beskikbaar nie. Gebruik HTTPS of tik die kode hieronder in.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } });
      if (generation.current !== run) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      if (!video.current) { stop(); return; }
      video.current.srcObject = media;
      await video.current.play();
      const { default: decode } = await import("jsqr");
      if (generation.current !== run) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Kamera-beeld kon nie gelees word nie. Tik die kode hieronder in.");
      const scan = () => {
        if (generation.current !== run) return;
        const frame = video.current;
        try {
          if (frame && frame.readyState >= 2 && frame.videoWidth) {
            const scale = Math.min(1, 800 / frame.videoWidth);
            canvas.width = Math.round(frame.videoWidth * scale);
            canvas.height = Math.round(frame.videoHeight * scale);
            context.drawImage(frame, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            const found = decode(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
            if (found?.data) { stop(); onCode(found.data); return; }
          }
          timer.current = setTimeout(scan, 180);
        } catch {
          stop(); setError("QR kon nie gelees word nie. Probeer weer of tik die kode in.");
        }
      };
      scan();
    } catch (err) {
      if (generation.current !== run) return;
      stop();
      setError(err instanceof Error && err.name === "NotAllowedError"
        ? "Kameratoegang is geweier. Laat kameratoegang in jou blaaier toe, of tik die kode in."
        : err instanceof Error ? err.message : "Kamera kon nie oopmaak nie.");
    }
  };
  return <section className="gate-camera">
    <video ref={video} muted playsInline aria-label="Kaartjie QR-kamera" style={{ width: "100%", maxHeight: 320, borderRadius: 16, display: active ? "block" : "none", objectFit: "cover" }} />
    {active ? <button className="app-secondary" type="button" onClick={stop}>Stop kamera</button>
      : <button className="app-primary" type="button" disabled={disabled} onClick={() => void start()}>Lees QR met kamera</button>}
    <p>Rig die kamera op een kaartjie. Bevestig daarna Scan in, Scan uit of Kontroleer hieronder.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
