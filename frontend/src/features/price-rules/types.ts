import type {
  PriceRuleOut,
  PriceRuleCreate,
  PriceRuleUpdate,
  PaymentMethodOut,
  PriceRuleProductEntry,
} from "@/types/api";

export type {
  PriceRuleOut as PriceRule,
  PriceRuleCreate,
  PriceRuleUpdate,
  PaymentMethodOut as PaymentMethod,
  PriceRuleProductEntry,
};

export interface FormProductEntry extends PriceRuleProductEntry {
  _nombre?: string;
}
