'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Characters ───────────────────────────────────────────────────────────────

export async function createCharacter(formData: FormData) {
  const name = formData.get('name') as string
  const role = formData.get('role') as string
  const description = formData.get('description') as string
  const stats = formData.get('stats') as string
  const affiliation = formData.get('affiliation') as string
  const status = formData.get('status') as string

  await prisma.character.create({
    data: { name, role, description, stats, affiliation, status: status || 'Active' },
  })
  revalidatePath('/characters')
  redirect('/characters')
}

export async function updateCharacter(id: number, formData: FormData) {
  const name = formData.get('name') as string
  const role = formData.get('role') as string
  const description = formData.get('description') as string
  const stats = formData.get('stats') as string
  const affiliation = formData.get('affiliation') as string
  const status = formData.get('status') as string

  await prisma.character.update({
    where: { id },
    data: { name, role, description, stats, affiliation, status },
  })
  revalidatePath('/characters')
  revalidatePath(`/characters/${id}`)
  redirect(`/characters/${id}`)
}

export async function deleteCharacter(id: number) {
  await prisma.character.delete({ where: { id } })
  revalidatePath('/characters')
  redirect('/characters')
}

// ─── Places ───────────────────────────────────────────────────────────────────

export async function createPlace(formData: FormData) {
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const region = formData.get('region') as string
  const notes = formData.get('notes') as string

  await prisma.place.create({ data: { name, type, description, region, notes } })
  revalidatePath('/places')
  redirect('/places')
}

export async function updatePlace(id: number, formData: FormData) {
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const region = formData.get('region') as string
  const notes = formData.get('notes') as string

  await prisma.place.update({ where: { id }, data: { name, type, description, region, notes } })
  revalidatePath('/places')
  revalidatePath(`/places/${id}`)
  redirect(`/places/${id}`)
}

export async function deletePlace(id: number) {
  await prisma.place.delete({ where: { id } })
  revalidatePath('/places')
  redirect('/places')
}

// ─── Inventory Items ──────────────────────────────────────────────────────────

export async function createInventoryItem(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const location = formData.get('location') as string
  const category = formData.get('category') as string

  await prisma.inventoryItem.create({ data: { name, description, effect, location, category } })
  revalidatePath('/inventory')
  redirect('/inventory')
}

export async function updateInventoryItem(id: number, formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const location = formData.get('location') as string
  const category = formData.get('category') as string

  await prisma.inventoryItem.update({
    where: { id },
    data: { name, description, effect, location, category },
  })
  revalidatePath('/inventory')
  revalidatePath(`/inventory/${id}`)
  redirect(`/inventory/${id}`)
}

export async function deleteInventoryItem(id: number) {
  await prisma.inventoryItem.delete({ where: { id } })
  revalidatePath('/inventory')
  redirect('/inventory')
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function createEvent(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const significance = formData.get('significance') as string
  const outcome = formData.get('outcome') as string

  await prisma.event.create({ data: { name, description, date, significance, outcome } })
  revalidatePath('/events')
  redirect('/events')
}

export async function updateEvent(id: number, formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const significance = formData.get('significance') as string
  const outcome = formData.get('outcome') as string

  await prisma.event.update({
    where: { id },
    data: { name, description, date, significance, outcome },
  })
  revalidatePath('/events')
  revalidatePath(`/events/${id}`)
  redirect(`/events/${id}`)
}

export async function deleteEvent(id: number) {
  await prisma.event.delete({ where: { id } })
  revalidatePath('/events')
  redirect('/events')
}

// ─── Powers ───────────────────────────────────────────────────────────────────

export async function createPower(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const personId = parseInt(formData.get('personId') as string, 10)

  await prisma.power.create({ data: { name, description, effect, personId } })
  revalidatePath('/powers')
  redirect('/powers')
}

export async function updatePower(id: number, formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const personId = parseInt(formData.get('personId') as string, 10)

  await prisma.power.update({
    where: { id },
    data: { name, description, effect, personId },
  })
  revalidatePath('/powers')
  revalidatePath(`/powers/${id}`)
  redirect(`/powers/${id}`)
}

export async function deletePower(id: number) {
  await prisma.power.delete({ where: { id } })
  revalidatePath('/powers')
  redirect('/powers')
}
