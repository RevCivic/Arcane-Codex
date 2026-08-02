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

export async function createEvent(formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const significance = formData.get('significance') as string
  const outcome = formData.get('outcome') as string
  const referenceLinks = getReferenceLinksFromForm(formData)
  const peopleIds = (formData.getAll('peopleIds') as string[])
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n))

  await prisma.event.create({
    data: {
      name, description, date, significance, outcome,
      referenceLinks,
      people: peopleIds.length > 0 ? { connect: peopleIds.map((id) => ({ id })) } : undefined,
    },
  })
  revalidatePath('/events')
  redirect('/events')
}

export async function createEventsBulk(formData: FormData) {
  await requireAuthorizedUser()

  const names = getFormStrings(formData, 'name')
  const dates = getFormStrings(formData, 'date')
  const significances = getFormStrings(formData, 'significance')
  const outcomes = getFormStrings(formData, 'outcome')

  const rows = names
    .map((name, i) => {
      if (!name) return null
      return {
        name,
        date: getNullableString(dates[i] ?? ''),
        significance: getNullableString(significances[i] ?? ''),
        outcome: getNullableString(outcomes[i] ?? ''),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length > 0) {
    await prisma.event.createMany({ data: rows })
    revalidatePath('/events')
  }

  redirect('/events')
}

export async function updateEvent(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const significance = formData.get('significance') as string
  const outcome = formData.get('outcome') as string
  const referenceLinks = getReferenceLinksFromForm(formData)
  const peopleIds = (formData.getAll('peopleIds') as string[])
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n))

  await prisma.event.update({
    where: { id },
    data: {
      name, description, date, significance, outcome, referenceLinks,
      people: { set: peopleIds.map((pid) => ({ id: pid })) },
    },
  })
  revalidatePath('/events')
  revalidatePath(`/events/${id}`)
  redirect(`/events/${id}`)
}

export async function deleteEvent(id: number) {
  await requireAuthorizedUser()

  await prisma.event.delete({ where: { id } })
  revalidatePath('/events')
  redirect('/events')
}
