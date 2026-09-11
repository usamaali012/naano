// Code -> display name for the country filter. Mirrors the codes
// apps/api/prisma/seed.ts actually seeds (read, not edited — session A owns
// seed.ts). GET /creators?country= takes the 2-letter code, case-insensitive.
export const COUNTRY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "NL", label: "Netherlands" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "SE", label: "Sweden" },
  { value: "IE", label: "Ireland" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
];

export function countryLabel(code: string): string {
  return COUNTRY_OPTIONS.find((c) => c.value === code)?.label ?? code;
}
