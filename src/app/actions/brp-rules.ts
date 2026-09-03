'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminUser } from './_shared'
import { ImportQueueStatus } from '@/generated/prisma'
import { scrapeBRPRules } from '@/lib/brpScraper'

export type BRPRuleRow = {
  id: number
  title: string
  section: string | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type BRPRuleDetail = BRPRuleRow & { content: string }

export async function getBRPRules(filters?: {
  section?: string
  includeContent?: boolean
}): Promise<(BRPRuleRow | BRPRuleDetail)[]> {
  const where: Record<string, unknown> = {}
  if (filters?.section) where.section = filters.section

  return prisma.bRPRule.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      section: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      ...(filters?.includeContent && { content: true }),
    },
  }) as Promise<(BRPRuleRow | BRPRuleDetail)[]>
}

export async function getBRPRuleById(id: number): Promise<BRPRuleDetail | null> {
  return prisma.bRPRule.findUnique({ where: { id } })
}

export async function createBRPRule(formData: FormData) {
  await requireAdminUser()

  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const section = (formData.get('section') as string | null)?.trim() || null
  const content = (formData.get('content') as string | null)?.trim() ?? ''
  const sortOrder = parseInt((formData.get('sortOrder') as string | null) ?? '0', 10) || 0

  if (!title) throw new Error('Title is required')
  if (!content) throw new Error('Content is required')

  await prisma.bRPRule.create({
    data: { title, section, content, sortOrder },
  })

  revalidatePath('/admin/brp-rules')
  revalidatePath('/brp-rules')
  redirect('/admin/brp-rules')
}

export async function updateBRPRule(id: number, formData: FormData) {
  await requireAdminUser()

  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const section = (formData.get('section') as string | null)?.trim() || null
  const content = (formData.get('content') as string | null)?.trim() ?? ''
  const sortOrder = parseInt((formData.get('sortOrder') as string | null) ?? '0', 10) || 0

  if (!title) throw new Error('Title is required')
  if (!content) throw new Error('Content is required')

  await prisma.bRPRule.update({
    where: { id },
    data: { title, section, content, sortOrder },
  })

  revalidatePath('/admin/brp-rules')
  revalidatePath('/brp-rules')
  redirect('/admin/brp-rules')
}

export async function deleteBRPRule(id: number) {
  await requireAdminUser()
  await prisma.bRPRule.delete({ where: { id } })
  revalidatePath('/admin/brp-rules')
  revalidatePath('/brp-rules')
}

export async function getBRPRuleImports(status?: ImportQueueStatus) {
  await requireAdminUser()
  
  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const items = await prisma.bRPRuleImport.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  })

  // Convert BigInt-safe JSON for client components
  return items.map((item) => ({
    id: item.id,
    ruleId: item.ruleId,
    ruleName: item.ruleName,
    incomingData: item.incomingData as Record<string, string | null>,
    existingData: item.existingData as Record<string, string | null> | null,
    status: item.status,
    sourceUrl: item.sourceUrl,
    createdAt: item.createdAt.toISOString(),
  }))
}

export async function approveBRPRuleImport(importId: number) {
  await requireAdminUser()

  const importItem = await prisma.bRPRuleImport.findUnique({
    where: { id: importId },
  })

  if (!importItem) throw new Error('Import not found')

  const incomingData = importItem.incomingData as Record<string, string>

  if (importItem.ruleId) {
    // Update existing rule
    await prisma.bRPRule.update({
      where: { id: importItem.ruleId },
      data: {
        title: incomingData.title ?? importItem.ruleName,
        section: incomingData.section ?? null,
        content: incomingData.content,
        sortOrder: incomingData.sortOrder ? parseInt(incomingData.sortOrder, 10) : 0,
      },
    })
  } else {
    // Create new rule
    await prisma.bRPRule.create({
      data: {
        title: incomingData.title ?? importItem.ruleName,
        section: incomingData.section ?? null,
        content: incomingData.content,
        sortOrder: incomingData.sortOrder ? parseInt(incomingData.sortOrder, 10) : 0,
      },
    })
  }

  // Mark import as approved
  await prisma.bRPRuleImport.update({
    where: { id: importId },
    data: { status: ImportQueueStatus.APPROVED },
  })

  revalidatePath('/admin/brp-rules/import-queue')
  revalidatePath('/admin/brp-rules')
  revalidatePath('/brp-rules')
}

export async function rejectBRPRuleImport(importId: number) {
  await requireAdminUser()

  await prisma.bRPRuleImport.update({
    where: { id: importId },
    data: { status: ImportQueueStatus.REJECTED },
  })

  revalidatePath('/admin/brp-rules/import-queue')
}

export async function createBRPRuleImport(
  title: string,
  section: string | null,
  content: string,
  sourceUrl?: string,
  ruleId?: number
) {
  await requireAdminUser()

  const incomingData = {
    title,
    section,
    content,
    sortOrder: '0',
  }

  let existingData: Record<string, string> | null = null
  if (ruleId) {
    const existing = await prisma.bRPRule.findUnique({ where: { id: ruleId } })
    if (existing) {
      existingData = {
        title: existing.title,
        section: existing.section ?? '',
        content: existing.content,
        sortOrder: existing.sortOrder.toString(),
      }
    }
  }

  return prisma.bRPRuleImport.create({
    data: {
      ruleId,
      ruleName: title,
      incomingData: incomingData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      existingData: existingData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      sourceUrl,
    },
  })
}

export async function createBRPRuleImportBatch(
  rules: Array<{
    title: string
    section: string | null
    content: string
    sourceUrl?: string
    ruleId?: number
  }>
) {
  await requireAdminUser()

  // Create all imports in a single batched operation
  const imports = await Promise.all(
    rules.map(async (rule) => {
      const incomingData = {
        title: rule.title,
        section: rule.section,
        content: rule.content,
        sortOrder: '0',
      }

      let existingData: Record<string, string> | null = null
      if (rule.ruleId) {
        const existing = await prisma.bRPRule.findUnique({ where: { id: rule.ruleId } })
        if (existing) {
          existingData = {
            title: existing.title,
            section: existing.section ?? '',
            content: existing.content,
            sortOrder: existing.sortOrder.toString(),
          }
        }
      }

      return {
        ruleId: rule.ruleId,
        ruleName: rule.title,
        incomingData: incomingData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        existingData: existingData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        sourceUrl: rule.sourceUrl,
      }
    })
  )

  // Insert all in a single batch
  return Promise.all(
    imports.map((data) =>
      prisma.bRPRuleImport.create({ data })
    )
  )
}

export async function scrapeBRPRulesFromWeb(url: string = 'https://brp.chaosium.com/basic-roleplaying/') {
  await requireAdminUser()

  const rules = await scrapeBRPRules(url)
  
  if (rules.length === 0) {
    throw new Error('No rules found at the given URL')
  }

  return rules
}
