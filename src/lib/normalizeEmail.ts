export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null
}
