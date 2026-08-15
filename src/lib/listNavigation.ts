/** Only permit return links into the expected list, preventing open redirects. */
export function getListReturnPath(value: string | null | undefined, listPath: `/${string}`): string {
  if (!value) return listPath
  if (value === listPath || value.startsWith(`${listPath}?`) || value.startsWith(`${listPath}#`)) return value
  try {
    const decoded = decodeURIComponent(value)
    if (decoded === listPath || decoded.startsWith(`${listPath}?`) || decoded.startsWith(`${listPath}#`)) return decoded
  } catch {
    // Fall through to the safe list root.
  }
  return listPath
}

export function entityDestination(path: string, returnTo: string): string {
  const params = new URLSearchParams({ returnTo })
  return `${path}?${params.toString()}`
}
