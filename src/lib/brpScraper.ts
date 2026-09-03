/**
 * Web scraper utility for fetching BRP rules from https://brp.chaosium.com/basic-roleplaying/
 * Parses HTML and converts to markdown-formatted rules.
 */

export interface ParsedRule {
  title: string
  section: string | null
  content: string
  sourceUrl: string
}

/**
 * Fetch and parse the BRP rules page
 * This is a simple HTML parser that extracts headings and content
 */
export async function scrapeBRPRules(baseUrl: string = 'https://brp.chaosium.com/basic-roleplaying/'): Promise<ParsedRule[]> {
  try {
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Arcane-Codex/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch BRP page: ${response.status}`)
    }

    const html = await response.text()

    // Simple HTML parsing - extract content between tags
    const rules = parseRulesFromHTML(html, baseUrl)
    return rules
  } catch (error) {
    throw new Error(`Failed to scrape BRP rules: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse HTML content into structured rules
 * Looks for common patterns like headings (h1-h6) and following content
 */
function parseRulesFromHTML(html: string, sourceUrl: string): ParsedRule[] {
  const rules: ParsedRule[] = []

  // Remove script and style tags
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Extract main content - look for common wrapper divs
  const contentMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    cleaned.match(/<div[^>]*id=['"](main-content|content|primary)[^>]*>([\s\S]*?)<\/div>/i)

  const contentArea = contentMatch ? contentMatch[1] : cleaned

  // Parse sections and headings
  const sections = contentArea.split(/<h[1-3]\b[^>]*>/i)
  let currentSection: string | null = null

  sections.forEach((section, index) => {
    // Extract section title from closing tag
    const titleMatch = section.match(/^([^<]+)<\/h[1-3]>([\s\S]*)/i)
    if (!titleMatch) return

    const title = cleanText(titleMatch[1])
    if (!title) return

    const contentPart = titleMatch[2]

    // Extract paragraphs and lists
    const paragraphs = extractParagraphs(contentPart)
    if (paragraphs.length === 0) return

    // Determine if this is a main section or subsection
    if (index <= 1) {
      currentSection = title
    }

    // Only include non-empty rules
    if (title.length > 0 && paragraphs.length > 0) {
      rules.push({
        title,
        section: currentSection,
        content: paragraphs.join('\n\n'),
        sourceUrl,
      })
    }
  })

  return rules
}

/**
 * Extract paragraphs from an HTML string
 */
function extractParagraphs(html: string): string[] {
  const paragraphs: string[] = []

  // Extract all p tags
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let match

  while ((match = pRegex.exec(html)) !== null) {
    const text = cleanText(match[1])
    if (text) {
      paragraphs.push(text)
    }
  }

  // Extract list items if no paragraphs found
  if (paragraphs.length === 0) {
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
    while ((match = liRegex.exec(html)) !== null) {
      const text = cleanText(match[1])
      if (text) {
        paragraphs.push(`- ${text}`)
      }
    }
  }

  return paragraphs
}

/**
 * Clean HTML text - remove tags and decode entities
 */
function cleanText(html: string): string {
  // Remove all HTML tags
  let text = html.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = decodeHTMLEntities(text)

  // Clean up whitespace
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text
}

/**
 * Decode common HTML entities
 * Note: &amp; must be decoded last to avoid double-decoding issues
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  }

  let result = text
  // Decode specific entities first
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char)
  }
  
  // Decode &amp; last to prevent double-decoding
  result = result.replace(/&amp;/g, '&')

  return result
}
