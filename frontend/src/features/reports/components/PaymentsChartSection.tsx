import PaymentMethodsDonut from "./PaymentMethodsDonut";
import PaymentMethodsBarChart from "./PaymentMethodsBarChart";
import type { PaymentMethodSummaryItem } from "@/types/api";
import type { PaymentChartMode } from "../types";

export interface PaymentsChartSectionProps {
  chartMode: PaymentChartMode;
  data: PaymentMethodSummaryItem[];
  currency: "USD" | "VES";
  currSymbol: string;
  conversionRate: number;
}

export default function PaymentsChartSection({
  chartMode,
  data,
  currency,
  currSymbol,
  conversionRate,
}: PaymentsChartSectionProps) {
  return (
    <div>
      {chartMode === "donut" ? (
        <PaymentMethodsDonut
          data={data}
          currency={currency}
          currSymbol={currSymbol}
          conversionRate={conversionRate}
        />
      ) : (
        <PaymentMethodsBarChart
          data={data}
          currency={currency}
          currSymbol={currSymbol}
          conversionRate={conversionRate}
        />
      )}
    </div>
  );
}
