export type GateSelectionOption = { id: number };

export function retainAvailableGateSelection(currentId: number, gates: GateSelectionOption[]): number {
  if (!Number.isSafeInteger(currentId) || currentId <= 0) return 0;
  return gates.some((gate) => Number(gate.id) === currentId) ? currentId : 0;
}
