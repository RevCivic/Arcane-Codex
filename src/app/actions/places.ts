'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  requireAuthorizedUser,
  getFormStrings,
  getNullableString,
  getReferenceLinksFromForm,
  resolveImageUrlFromForm,
} from './_shared'

export async function createPlace(formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const region = formData.get('region') as string
  const coordinates = formData.get('coordinates') as string
  const mapsLink = formData.get('mapsLink') as string
  const notes = formData.get('notes') as string
  const imageUrl = await resolveImageUrlFromForm(formData)
  const referenceLinks = getReferenceLinksFromForm(formData)

  await prisma.place.create({ data: { name, type, description, region, coordinates, mapsLink, imageUrl, referenceLinks, notes } })
  revalidatePath('/places')
  redirect('/places')
}

export async function createPlacesBulk(formData: FormData) {
  await requireAuthorizedUser()

  const names = getFormStrings(formData, 'name')
  const types = getFormStrings(formData, 'type')
  const regions = getFormStrings(formData, 'region')
  const descriptions = getFormStrings(formData, 'description')

  const rows = names
    .map((name, i) => {
      if (!name) return null
      return {
        name,
        type: getNullableString(types[i] ?? ''),
        region: getNullableString(regions[i] ?? ''),
        description: getNullableString(descriptions[i] ?? ''),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length > 0) {
    await prisma.place.createMany({ data: rows })
    revalidatePath('/places')
  }

  redirect('/places')
}

export async function updatePlace(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const region = formData.get('region') as string
  const coordinates = formData.get('coordinates') as string
  const mapsLink = formData.get('mapsLink') as string
  const notes = formData.get('notes') as string
  const existingPlace = await prisma.place.findUnique({ where: { id }, select: { imageUrl: true } })
  const imageUrl = await resolveImageUrlFromForm(formData, existingPlace?.imageUrl)
  const referenceLinks = getReferenceLinksFromForm(formData)

  await prisma.place.update({ where: { id }, data: { name, type, description, region, coordinates, mapsLink, imageUrl, referenceLinks, notes } })
  revalidatePath('/places')
  revalidatePath(`/places/${id}`)
  redirect(`/places/${id}`)
}

export async function deletePlace(id: number) {
  await requireAuthorizedUser()

  await prisma.place.delete({ where: { id } })
  revalidatePath('/places')
  redirect('/places')
}
