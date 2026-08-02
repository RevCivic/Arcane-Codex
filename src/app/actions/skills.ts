'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminUser } from './_shared'

export async function createSkill(formData: FormData) {
  await requireAdminUser()

  const name = (formData.get('name') as string).trim()
  const category = (formData.get('category') as string | null)?.trim() || null
  const baseValue = parseInt(formData.get('baseValue') as string, 10)
  const description = (formData.get('description') as string | null)?.trim() || null
  const sortOrder = parseInt((formData.get('sortOrder') as string | null) ?? '0', 10)

  if (!name) throw new Error('Skill name is required')

  await prisma.skill.create({
    data: {
      name,
      category,
      baseValue: isNaN(baseValue) ? 0 : baseValue,
      description,
      sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
    },
  })
  revalidatePath('/admin/skills')
  redirect('/admin/skills')
}

export async function updateSkill(id: number, formData: FormData) {
  await requireAdminUser()

  const name = (formData.get('name') as string).trim()
  const category = (formData.get('category') as string | null)?.trim() || null
  const baseValue = parseInt(formData.get('baseValue') as string, 10)
  const description = (formData.get('description') as string | null)?.trim() || null
  const sortOrder = parseInt((formData.get('sortOrder') as string | null) ?? '0', 10)

  if (!name) throw new Error('Skill name is required')

  await prisma.skill.update({
    where: { id },
    data: {
      name,
      category,
      baseValue: isNaN(baseValue) ? 0 : baseValue,
      description,
      sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
    },
  })
  revalidatePath('/admin/skills')
  redirect('/admin/skills')
}

export async function deleteSkill(id: number) {
  await requireAdminUser()
  await prisma.skill.delete({ where: { id } })
  revalidatePath('/admin/skills')
}
