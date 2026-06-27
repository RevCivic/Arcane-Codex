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

export type AIEntityType = (typeof AI_ENTITY_TYPE_OPTIONS)[number]['value']

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
