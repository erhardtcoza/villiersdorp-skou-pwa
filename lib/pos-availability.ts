export function livePOSAreasFromHealth(detail: string | null | undefined): Set<string> {
  const match = String(detail || "").match(/\blive\s+pos\s+areas\s*:\s*([^.]*)/i);
  if (!match) return new Set();
  return new Set(match[1].split(",").map((area) => area.trim().toLowerCase()).filter(Boolean));
}

export function isPOSModuleAvailable(moduleKey: string, detail: string | null | undefined): boolean {
  if (moduleKey === "bar-pos") return livePOSAreasFromHealth(detail).has("kroeg");
  return true;
}
