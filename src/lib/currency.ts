/**
 * Currency configuration.
 *
 * Defaults to the Sierra Leonean leone. `SLE` is the redenominated new leone
 * introduced in 2022 — not `SLL`, the old code, which formats as a bare "SLL"
 * and represents amounts 1000× larger.
 *
 * Amounts are stored as DECIMAL(12,2) and only ever formatted for display, so
 * changing these values never rewrites stored data.
 *
 * Vercel’s Node image does not ship every locale. `en-SL` throws
 * `Incorrect locale information provided` at module load, so we fall back.
 */

const PREFERRED_LOCALE = process.env.NEXT_PUBLIC_CURRENCY_LOCALE ?? "en-SL";

function localeIsSupported(locale: string): boolean {
  try {
    if (Intl.getCanonicalLocales(locale).length === 0) return false;
    new Intl.NumberFormat(locale).format(1);
    return true;
  } catch {
    return false;
  }
}

function resolveLocale(preferred: string): string {
  for (const locale of [preferred, "en-GB", "en-US", "en"]) {
    if (localeIsSupported(locale)) return locale;
  }
  return "en-US";
}

export const CURRENCY_CODE = process.env.NEXT_PUBLIC_CURRENCY ?? "SLE";
export const CURRENCY_LOCALE = resolveLocale(PREFERRED_LOCALE);

export function createCurrencyFormat(
  options: Intl.NumberFormatOptions = {}
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: "currency",
      currency: CURRENCY_CODE,
      ...options,
    });
  } catch {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    });
  }
}

/** The symbol on its own ("Le"), for form labels and input prefixes. */
export const CURRENCY_SYMBOL = (() => {
  try {
    return (
      createCurrencyFormat()
        .formatToParts(1)
        .find((part) => part.type === "currency")?.value ??
      (CURRENCY_CODE === "SLE" ? "Le" : CURRENCY_CODE)
    );
  } catch {
    return CURRENCY_CODE === "SLE" ? "Le" : CURRENCY_CODE;
  }
})();
