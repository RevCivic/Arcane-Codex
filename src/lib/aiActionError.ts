export function getAIActionErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  if (/failed to find server action|older or newer deployment/i.test(message)) {
    return 'The application was updated while this page was open. Refresh the page and try again.'
  }
  return message || fallback
}
