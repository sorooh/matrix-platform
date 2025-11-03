import { addMemory, searchMemory } from './memory'

export const ORG_ID = '__org__'

export function addOrgMemory(text: string, metadata?: Record<string, unknown>) {
  return addMemory(ORG_ID, text, { scope: 'org', ...metadata })
}

export function searchOrgMemory(query: string, topK = 5) {
  return searchMemory(ORG_ID, query, topK)
}


