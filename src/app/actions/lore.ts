'use server'

import { LoreDocumentType } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminUser } from './_shared'

export type LoreDocumentRow = {
  id: number
  title: string
  type: LoreDocumentType
  summary: string | null
  isActive: boolean
  sortOrder: number
  tags: string | null
  createdAt: Date
  updatedAt: Date
}

export type LoreDocumentDetail = LoreDocumentRow & { content: string }

export async function getLoreDocuments(filters?: {
  type?: LoreDocumentType
  isActive?: boolean
}): Promise<LoreDocumentRow[]> {
  const where: Record<string, unknown> = {}
  if (filters?.type) where.type = filters.type
  if (filters?.isActive !== undefined) where.isActive = filters.isActive

  return prisma.loreDocument.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      type: true,
      summary: true,
      isActive: true,
      sortOrder: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function getLoreDocumentById(id: number): Promise<LoreDocumentDetail | null> {
  return prisma.loreDocument.findUnique({ where: { id } })
}

export async function getActiveLoreContext(): Promise<string> {
  const docs = await prisma.loreDocument.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { title: true, type: true, summary: true, content: true },
  })

  if (!docs.length) return ''

  const sections = docs.map((doc) => {
    const header = `[${doc.type.replace(/_/g, ' ')}] ${doc.title}`
    const body = doc.summary || doc.content.slice(0, 500)
    return `${header}\n${body}`
  })

  return `--- World Lore Context ---\n${sections.join('\n\n')}\n--- End Lore Context ---`
}

export async function createLoreDocument(formData: FormData) {
  await requireAdminUser()

  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const type = (formData.get('type') as LoreDocumentType | null) ?? LoreDocumentType.CUSTOM
  const summary = (formData.get('summary') as string | null)?.trim() || null
  const content = (formData.get('content') as string | null)?.trim() ?? ''
  const isActive = formData.get('isActive') === 'true'
  const sortOrder = parseInt((formData.get('sortOrder') as string | null) ?? '0', 10) || 0
  const tags = (formData.get('tags') as string | null)?.trim() || null

  if (!title) throw new Error('Title is required')
  if (!content) throw new Error('Content is required')

  await prisma.loreDocument.create({
    data: { title, type, summary, content, isActive, sortOrder, tags },
  })

  revalidatePath('/admin/lore')
  redirect('/admin/lore')
}

export async function updateLoreDocument(id: number, formData: FormData) {
  await requireAdminUser()

  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const type = (formData.get('type') as LoreDocumentType | null) ?? LoreDocumentType.CUSTOM
  const summary = (formData.get('summary') as string | null)?.trim() || null
  const content = (formData.get('content') as string | null)?.trim() ?? ''
  const isActive = formData.get('isActive') === 'true'
  const sortOrder = parseInt((formData.get('sortOrder') as string | null) ?? '0', 10) || 0
  const tags = (formData.get('tags') as string | null)?.trim() || null

  if (!title) throw new Error('Title is required')
  if (!content) throw new Error('Content is required')

  await prisma.loreDocument.update({
    where: { id },
    data: { title, type, summary, content, isActive, sortOrder, tags },
  })

  revalidatePath('/admin/lore')
  redirect('/admin/lore')
}

export async function toggleLoreDocumentActive(id: number, isActive: boolean) {
  await requireAdminUser()
  await prisma.loreDocument.update({ where: { id }, data: { isActive } })
  revalidatePath('/admin/lore')
}

export async function deleteLoreDocument(id: number) {
  await requireAdminUser()
  await prisma.loreDocument.delete({ where: { id } })
  revalidatePath('/admin/lore')
}
