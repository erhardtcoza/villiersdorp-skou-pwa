export function canSubmitGateScan({ online, busy, direction, gateId }: {
  online: boolean | null;
  busy: boolean;
  direction: "in" | "out" | "check";
  gateId: number;
}) {
  if (online !== true || busy) return false;
  return direction === "check" || gateId > 0;
}
