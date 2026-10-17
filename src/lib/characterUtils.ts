/**
 * Utility for converting character data to the shape expected by CharacterQuickEdit
 */

export function createQuickEditCharacter(character: {
  name: string
  role: string | null
  status: string | null
  affiliation: string | null
  currentCase: string | null
  currentLocation: string | null
  race: string | null
  gender: string | null
  age: bigint | null | string
}) {
  return {
    name: character.name,
    role: character.role,
    status: character.status,
    affiliation: character.affiliation,
    currentCase: character.currentCase,
    currentLocation: character.currentLocation,
    race: character.race,
    gender: character.gender,
    age: typeof character.age === 'bigint' ? character.age.toString() : (character.age ?? null),
  }
}
