export const AI_ENTITY_TYPE_OPTIONS = [
  { value: 'player_investigator', label: 'Player Investigator' },
  { value: 'ally_npc', label: 'Ally NPC' },
  { value: 'hostile_npc', label: 'Hostile NPC' },
  { value: 'neutral_contact', label: 'Neutral Contact' },
  { value: 'creature_entity', label: 'Creature / Entity' },
  { value: 'deity_cosmic_power', label: 'Deity / Cosmic Power' },
  { value: 'other', label: 'Other' },
] as const

export const AI_TONE_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'gothic', label: 'Gothic' },
  { value: 'grim', label: 'Grim' },
  { value: 'mysterious', label: 'Mysterious' },
  { value: 'scholarly', label: 'Scholarly' },
  { value: 'heroic', label: 'Heroic' },
  { value: 'tragic', label: 'Tragic' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'surreal', label: 'Surreal' },
] as const

export const AI_PLAYER_RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'supportive', label: 'Supportive' },
  { value: 'adversarial', label: 'Adversarial' },
  { value: 'uncertain', label: 'Uncertain' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'revered', label: 'Revered / Worshipped' },
  { value: 'predatory', label: 'Predatory' },
] as const

export const AI_THREAT_LEVEL_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'apocalyptic', label: 'Apocalyptic' },
] as const

export const AI_FACTION_ALIGNMENT_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'bureau', label: 'Bureau / Investigation' },
  { value: 'civilian', label: 'Civilian / Mundane' },
  { value: 'cult', label: 'Cult / Forbidden Order' },
  { value: 'occult', label: 'Occult Society' },
  { value: 'cosmic', label: 'Cosmic / Divine' },
  { value: 'independent', label: 'Independent' },
] as const

export const AI_METAPHYSICAL_NATURE_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'mortal', label: 'Mortal' },
  { value: 'touched', label: 'Supernaturally Touched' },
  { value: 'spectral', label: 'Spectral / Undead' },
  { value: 'eldritch', label: 'Eldritch / Otherworldly' },
  { value: 'divine', label: 'Divine / Cosmic' },
  { value: 'constructed', label: 'Constructed / Artificial' },
] as const

export const AI_MECHANICAL_FOCUS_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'social', label: 'Social Influence' },
  { value: 'combat', label: 'Combat Pressure' },
  { value: 'stealth', label: 'Stealth / Infiltration' },
  { value: 'occult', label: 'Occult Mastery' },
  { value: 'survival', label: 'Survival / Endurance' },
  { value: 'command', label: 'Leadership / Command' },
  { value: 'support', label: 'Support / Healing' },
  { value: 'knowledge', label: 'Knowledge / Investigation' },
] as const

export const AI_ITEM_RARITY_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'artifact', label: 'Artifact' },
] as const

export const AI_ITEM_PURPOSE_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'weapon', label: 'Weapon / Combat' },
  { value: 'protective', label: 'Protective / Defensive' },
  { value: 'utility', label: 'Utility / Tool' },
  { value: 'knowledge', label: 'Knowledge / Reference' },
  { value: 'magical', label: 'Magical / Arcane' },
  { value: 'cursed', label: 'Cursed / Dangerous' },
] as const

export const AI_POWER_COST_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'free', label: 'Free / No Cost' },
  { value: 'sanity', label: 'Sanity Cost' },
  { value: 'mp', label: 'Magic Points Cost' },
  { value: 'hp', label: 'Hit Points Cost' },
  { value: 'complex', label: 'Complex / Ritual' },
] as const

export const AI_POWER_RARITY_OPTIONS = [
  { value: '', label: 'Infer from prompt' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'unique', label: 'Unique' },
] as const

export type AIEntityType = (typeof AI_ENTITY_TYPE_OPTIONS)[number]['value']
export type AIItemRarity = (typeof AI_ITEM_RARITY_OPTIONS)[number]['value']
export type AIItemPurpose = (typeof AI_ITEM_PURPOSE_OPTIONS)[number]['value']
export type AIPowerCost = (typeof AI_POWER_COST_OPTIONS)[number]['value']
export type AIPowerRarity = (typeof AI_POWER_RARITY_OPTIONS)[number]['value']

export type AIPromptContext = {
  entityType: AIEntityType | ''
  narrativeRole: string
  tone: string
  playerRelationship: string
  threatLevel: string
  factionAlignment: string
  metaphysicalNature: string
  mechanicalFocus: string
}

export type AIInventoryItemPromptContext = {
  rarity: AIItemRarity | ''
  purpose: AIItemPurpose | ''
  tone: string
  mechanicalFocus: string
  narrativeRole: string
}

export type AIPowerPromptContext = {
  cost: AIPowerCost | ''
  rarity: AIPowerRarity | ''
  tone: string
  mechanicalFocus: string
  narrativeRole: string
}

export const DEFAULT_AI_PROMPT_CONTEXT: AIPromptContext = {
  entityType: '',
  narrativeRole: '',
  tone: '',
  playerRelationship: '',
  threatLevel: '',
  factionAlignment: '',
  metaphysicalNature: '',
  mechanicalFocus: '',
}

export const DEFAULT_AI_INVENTORY_ITEM_CONTEXT: AIInventoryItemPromptContext = {
  rarity: '',
  purpose: '',
  tone: '',
  mechanicalFocus: '',
  narrativeRole: '',
}

export const DEFAULT_AI_POWER_CONTEXT: AIPowerPromptContext = {
  cost: '',
  rarity: '',
  tone: '',
  mechanicalFocus: '',
  narrativeRole: '',
}
