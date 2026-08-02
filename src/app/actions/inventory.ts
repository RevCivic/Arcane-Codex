'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  requireAuthorizedUser,
  getFormStrings,
  getNullableString,
  getReferenceLinksFromForm,
} from './_shared'

export async function createInventoryItem(formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const location = formData.get('location') as string
  const category = formData.get('category') as string
  const carrierIdRaw = formData.get('carrierId') as string
  const carrierId = carrierIdRaw ? parseInt(carrierIdRaw, 10) : null
  const referenceLinks = getReferenceLinksFromForm(formData)

  await prisma.inventoryItem.create({ data: { name, description, effect, location, category, carrierId, referenceLinks } })
  revalidatePath('/inventory')
  redirect('/inventory')
}

export async function createInventoryItemsBulk(formData: FormData) {
  await requireAuthorizedUser()

  const names = getFormStrings(formData, 'name')
  const categories = getFormStrings(formData, 'category')
  const locations = getFormStrings(formData, 'location')
  const effects = getFormStrings(formData, 'effect')
  const carrierIds = getFormStrings(formData, 'carrierId')

  const rows = names
    .map((name, i) => {
      if (!name) return null

      const carrierRaw = carrierIds[i] ?? ''
      const parsedCarrier = carrierRaw ? parseInt(carrierRaw, 10) : NaN
      const carrierId = isNaN(parsedCarrier) ? null : parsedCarrier

      return {
        name,
        category: getNullableString(categories[i] ?? ''),
        location: getNullableString(locations[i] ?? ''),
        effect: getNullableString(effects[i] ?? ''),
        carrierId,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length > 0) {
    await prisma.inventoryItem.createMany({ data: rows })
    revalidatePath('/inventory')
  }

  redirect('/inventory')
}

export async function updateInventoryItem(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const location = formData.get('location') as string
  const category = formData.get('category') as string
  const carrierIdRaw = formData.get('carrierId') as string
  const carrierId = carrierIdRaw ? parseInt(carrierIdRaw, 10) : null
  const referenceLinks = getReferenceLinksFromForm(formData)

  await prisma.inventoryItem.update({
    where: { id },
    data: { name, description, effect, location, category, carrierId, referenceLinks },
  })
  revalidatePath('/inventory')
  revalidatePath(`/inventory/${id}`)
  redirect(`/inventory/${id}`)
}

export async function deleteInventoryItem(id: number) {
  await requireAuthorizedUser()

  await prisma.inventoryItem.delete({ where: { id } })
  revalidatePath('/inventory')
  redirect('/inventory')
}
