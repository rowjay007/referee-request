const DEFAULT_LOCALE = "en-US";

export function formatDateTime(
  value: string | Date,
  timezone = "UTC",
  locale = DEFAULT_LOCALE,
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date);
  }
}

export function formatDate(
  value: string | Date,
  timezone = "UTC",
  locale = DEFAULT_LOCALE,
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(date);
  }
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = DEFAULT_LOCALE,
) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatPhoneNumber(value: string, countryCode = "") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+\s().-]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  return countryCode && digits ? `+${countryCode.replace(/\D/g, "")}${digits}` : trimmed;
}