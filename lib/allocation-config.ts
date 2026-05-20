/**
 * Allocation configuration for mandatory providers and fair distribution pools
 * 
 * Mandatory providers always receive leads if quota is available
 * Fair pools use persistent round-robin for remaining slots
 */

export const MANDATORY_PROVIDERS: Record<number, number[]> = {
  // Service 1: Provider 1 always receives
  1: [1],
  // Service 2: Provider 5 always receives
  2: [5],
  // Service 3: Provider 1 AND Provider 4 always receive
  3: [1, 4],
}

export const FAIR_ALLOCATION_POOLS: Record<number, number[]> = {
  // Service 1: Providers 2, 3, 4
  1: [2, 3, 4],
  // Service 2: Providers 6, 7, 8
  2: [6, 7, 8],
  // Service 3: Providers 2, 3, 5, 6, 7, 8
  3: [2, 3, 5, 6, 7, 8],
}

export const REQUIRED_ASSIGNMENTS = 3
