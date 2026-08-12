export type {
  ExchangeRateOut as ExchangeRate,
  ExchangeRatesResponse,
} from "@/types/api";

export type RateInterval = "7D" | "30D" | "90D" | "6M" | "1A";

export const RATE_INTERVALS: RateInterval[] = ["7D", "30D", "90D", "6M", "1A"];

export const RATE_INTERVAL_DAYS: Record<RateInterval, number> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
  "6M": 180,
  "1A": 365,
};

export interface RateTrendPoint {
  fecha: string;
  usd: number;
  eur: number;
}
