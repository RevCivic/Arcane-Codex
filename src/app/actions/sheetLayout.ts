'use server'

import { AccessRole } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { requireAuthorizedUser, requireAdminUser } from './_shared'

/**
 * Layout preference interface used by the UI
 */
export interface SheetLayoutPreferenceData {
  hiddenModules: string[]
  moduleOrder: string[]
  moduleSizes: Record<string, { width?: string; height?: string }>
}

/**
 * Get layout preferences for the current user for a specific character.
 * Falls back to admin default if the user has no custom preference.
 */
export async function getSheetLayoutPreference(characterId: number): Promise<SheetLayoutPreferenceData> {
  const user = await requireAuthorizedUser()
  const normalizedEmail = normalizeEmail(user.email || '')

  try {
    // Try to get user-specific preference
    const userPreference = await prisma.sheetLayoutPreference.findFirst({
      where: {
        userEmail: normalizedEmail,
        characterId,
      },
    })

    if (userPreference) {
      return {
        hiddenModules: Array.isArray(userPreference.hiddenModules) ? (userPreference.hiddenModules as string[]) : [],
        moduleOrder: Array.isArray(userPreference.moduleOrder) ? (userPreference.moduleOrder as string[]) : [],
        moduleSizes: typeof userPreference.moduleSizes === 'object' && userPreference.moduleSizes ? (userPreference.moduleSizes as Record<string, { width?: string; height?: string }>) : {},
      }
    }

    // Fall back to admin default if no user preference exists
    const adminDefault = await prisma.sheetLayoutPreference.findFirst({
      where: {
        userEmail: null,
        characterId: null,
      },
    })

    if (adminDefault) {
      return {
        hiddenModules: Array.isArray(adminDefault.hiddenModules) ? (adminDefault.hiddenModules as string[]) : [],
        moduleOrder: Array.isArray(adminDefault.moduleOrder) ? (adminDefault.moduleOrder as string[]) : [],
        moduleSizes: typeof adminDefault.moduleSizes === 'object' && adminDefault.moduleSizes ? (adminDefault.moduleSizes as Record<string, { width?: string; height?: string }>) : {},
      }
    }

    // Return empty defaults if no preference exists
    return {
      hiddenModules: [],
      moduleOrder: [],
      moduleSizes: {},
    }
  } catch {
    // If there's any error, return empty defaults
    return {
      hiddenModules: [],
      moduleOrder: [],
      moduleSizes: {},
    }
  }
}

/**
 * Save layout preferences for the current user for a specific character.
 */
export async function saveSheetLayoutPreference(
  characterId: number,
  preference: SheetLayoutPreferenceData
): Promise<void> {
  const user = await requireAuthorizedUser()
  const normalizedEmail = normalizeEmail(user.email || '')

  // First, try to find existing preference
  const existing = await prisma.sheetLayoutPreference.findFirst({
    where: {
      userEmail: normalizedEmail,
      characterId,
    },
  })

  if (existing) {
    // Update existing
    await prisma.sheetLayoutPreference.update({
      where: { id: existing.id },
      data: {
        hiddenModules: preference.hiddenModules,
        moduleOrder: preference.moduleOrder,
        moduleSizes: preference.moduleSizes,
        updatedAt: new Date(),
      },
    })
  } else {
    // Create new
    await prisma.sheetLayoutPreference.create({
      data: {
        userEmail: normalizedEmail,
        characterId,
        hiddenModules: preference.hiddenModules,
        moduleOrder: preference.moduleOrder,
        moduleSizes: preference.moduleSizes,
      },
    })
  }
}

/**
 * Set admin default layout preferences (applies to all users viewing character sheets).
 * Only admins can call this.
 */
export async function setAdminDefaultSheetLayout(preference: SheetLayoutPreferenceData): Promise<void> {
  await requireAdminUser()

  // First, try to find existing admin default
  const existing = await prisma.sheetLayoutPreference.findFirst({
    where: {
      userEmail: null,
      characterId: null,
    },
  })

  if (existing) {
    // Update existing
    await prisma.sheetLayoutPreference.update({
      where: { id: existing.id },
      data: {
        hiddenModules: preference.hiddenModules,
        moduleOrder: preference.moduleOrder,
        moduleSizes: preference.moduleSizes,
        updatedAt: new Date(),
      },
    })
  } else {
    // Create new
    await prisma.sheetLayoutPreference.create({
      data: {
        userEmail: null,
        characterId: null,
        hiddenModules: preference.hiddenModules,
        moduleOrder: preference.moduleOrder,
        moduleSizes: preference.moduleSizes,
      },
    })
  }
}

/**
 * Get the admin default layout preferences.
 * Only admins can call this.
 */
export async function getAdminDefaultSheetLayout(): Promise<SheetLayoutPreferenceData> {
  await requireAdminUser()

  try {
    const adminDefault = await prisma.sheetLayoutPreference.findFirst({
      where: {
        userEmail: null,
        characterId: null,
      },
    })

    if (adminDefault) {
      return {
        hiddenModules: Array.isArray(adminDefault.hiddenModules) ? (adminDefault.hiddenModules as string[]) : [],
        moduleOrder: Array.isArray(adminDefault.moduleOrder) ? (adminDefault.moduleOrder as string[]) : [],
        moduleSizes: typeof adminDefault.moduleSizes === 'object' && adminDefault.moduleSizes ? (adminDefault.moduleSizes as Record<string, { width?: string; height?: string }>) : {},
      }
    }

    return {
      hiddenModules: [],
      moduleOrder: [],
      moduleSizes: {},
    }
  } catch {
    return {
      hiddenModules: [],
      moduleOrder: [],
      moduleSizes: {},
    }
  }
}

/**
 * Reset user's sheet layout preference for a character (delete it).
 * This will cause the user to fall back to the admin default on next load.
 */
export async function resetSheetLayoutPreference(characterId: number): Promise<void> {
  const user = await requireAuthorizedUser()
  const normalizedEmail = normalizeEmail(user.email || '')

  const existing = await prisma.sheetLayoutPreference.findFirst({
    where: {
      userEmail: normalizedEmail,
      characterId,
    },
  })

  if (existing) {
    await prisma.sheetLayoutPreference.delete({
      where: { id: existing.id },
    })
  }
}
