import { lazy, Suspense } from "react";
import { Skeleton } from "@/ui-components/Skeleton";
import type { PaymentMethodSummaryItem } from "@/types/api";
import type { PaymentChartMode } from "../types";

const PaymentMethodsDonut = lazy(() => import("./PaymentMethodsDonut"));
const PaymentMethodsBarChart = lazy(() => import("./PaymentMethodsBarChart"));

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
      <Suspense fallback={<Skeleton className="h-75 w-full" />}>
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
      </Suspense>
    </div>
  );
}
