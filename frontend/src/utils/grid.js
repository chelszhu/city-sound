export function getGridCellSize(zoom) {
  const z = Math.min(17, Math.max(10, Math.round(zoom)));
  const sizes = {
    10: 0.05,
    11: 0.025,
    12: 0.0125,
    13: 0.00625,
    14: 0.003125,
    15: 0.001562,
    16: 0.000781,
    17: 0.000390,
  };
  return sizes[z] ?? 0.0125;
}
