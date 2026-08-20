/**
 * Currency configuration.
 *
 * Defaults to the Sierra Leonean leone. `SLE` is the redenominated new leone
 * introduced in 2022 — not `SLL`, the old code, which formats as a bare "SLL"
 * and represents amounts 1000× larger.
 *
 * Amounts are stored as DECIMAL(12,2) and only ever formatted for display, so
 * changing these values never rewrites stored data.
 */

export const CURRENCY_CODE = process.env.NEXT_PUBLIC_CURRENCY ?? "SLE";
export const CURRENCY_LOCALE = process.env.NEXT_PUBLIC_CURRENCY_LOCALE ?? "en-SL";

/** The symbol on its own ("Le"), for form labels and input prefixes. */
export const CURRENCY_SYMBOL =
  new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
  })
    .formatToParts(1)
    .find((part) => part.type === "currency")?.value ?? CURRENCY_CODE;
