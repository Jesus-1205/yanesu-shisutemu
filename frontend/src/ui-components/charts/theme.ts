export const chartColors = {
  brand: "#1E40AF",
  brandLight: "#3B82F6",
  accent: "#EA580C",
  accentLight: "#FB923C",
  success: "#16A34A",
  successLight: "#4ADE80",
  danger: "#DC2626",
  dangerLight: "#F87171",
  info: "#2563EB",
  infoLight: "#60A5FA",
  slate: "#64748B",
  slateLight: "#94A3B8",
  slateBg: "#F1F5F9",
};

export const chartPalette = [
  chartColors.brand,
  chartColors.accent,
  chartColors.success,
  chartColors.info,
  chartColors.danger,
  chartColors.slate,
];

export const axisStyle = {
  tick: { fill: "#64748B", fontSize: 12 },
  axisLine: { stroke: "#E2E8F0" },
  tickLine: false,
};

export const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    fontSize: "0.875rem",
  },
  itemStyle: { color: "#0F172A" },
  labelStyle: { color: "#64748B", fontWeight: 500 },
};
