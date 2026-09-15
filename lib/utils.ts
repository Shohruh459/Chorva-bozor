export function formatPrice(price: number): string {
  return `${new Intl.NumberFormat("uz-UZ").format(price)} so'm`;
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function telegramDeepLink(username: string): string {
  return `https://t.me/${username.replace(/^@/, "")}`;
}

export function telDeepLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
