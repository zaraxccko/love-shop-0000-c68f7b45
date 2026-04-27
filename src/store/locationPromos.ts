import { create } from "zustand";
import { persist } from "zustand/middleware";
import { findCity } from "@/data/locations";
import type { Product } from "@/types/shop";

export interface LocationPromoRule {
  /** Gift grams for purchases from 5g. */
  giftFor5: number;
  /** Gift grams for purchases from 10g. Null means inherit the 5g gift. */
  giftFor10: number | null;
}

interface LocationPromosState {
  rules: Record<string, LocationPromoRule>;
  setRule: (slug: string, rule: LocationPromoRule) => void;
  resetRule: (slug: string) => void;
}

export const DEFAULT_PROMO_RULE: LocationPromoRule = { giftFor5: 5, giftFor10: null };
export const UAE_PROMO_RULE: LocationPromoRule = { giftFor5: 2, giftFor10: 5 };

const cleanRule = (rule: LocationPromoRule): LocationPromoRule => ({
  giftFor5: Math.max(0, Math.floor(Number(rule.giftFor5) || 0)),
  giftFor10: rule.giftFor10 == null ? null : Math.max(0, Math.floor(Number(rule.giftFor10) || 0)),
});

export const getDefaultPromoRule = (slug?: string | null): LocationPromoRule => {
  if (!slug) return DEFAULT_PROMO_RULE;
  const cityInfo = findCity(slug);
  return slug === "uae" || cityInfo?.country.slug === "uae" ? UAE_PROMO_RULE : DEFAULT_PROMO_RULE;
};

export const resolvePromoRule = (
  rules: Record<string, LocationPromoRule>,
  citySlug?: string | null,
): LocationPromoRule => {
  const cityInfo = citySlug ? findCity(citySlug) : null;
  const cityRule = citySlug ? rules[citySlug] : undefined;
  const countryRule = cityInfo ? rules[cityInfo.country.slug] : undefined;
  return cleanRule(cityRule ?? countryRule ?? getDefaultPromoRule(citySlug));
};

export const getPromoGiftGrams = (
  rules: Record<string, LocationPromoRule>,
  citySlug: string | null | undefined,
  boughtGrams: number,
) => {
  const rule = resolvePromoRule(rules, citySlug);
  if (boughtGrams >= 10 && rule.giftFor10 != null && rule.giftFor10 > 0) return rule.giftFor10;
  if (boughtGrams >= 5 && rule.giftFor5 > 0) return rule.giftFor5;
  return 0;
};

export const findGiftVariant = (product: Product, giftGrams: number) =>
  product.variants?.find((v) => v.grams === giftGrams || v.id === `${giftGrams}g`);

export const useLocationPromos = create<LocationPromosState>()(
  persist(
    (set) => ({
      rules: {},
      setRule: (slug, rule) =>
        set((s) => ({ rules: { ...s.rules, [slug]: cleanRule(rule) } })),
      resetRule: (slug) =>
        set((s) => {
          const { [slug]: _removed, ...rules } = s.rules;
          return { rules };
        }),
    }),
    { name: "loveshop-location-promos" },
  ),
);