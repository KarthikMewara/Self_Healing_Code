import { GENERATOR_TARGETS, type GeneratedTests, type TestType } from "@/services/mock/testing"

export type CoverageTarget = "60" | "80" | "95"
export type GeneratorPhase = "idle" | "thinking" | "typing" | "done"

/** Lives in the page so a generated file survives switching tabs. */
export interface GeneratorState {
  targetId: string
  coverage: CoverageTarget
  types: TestType[]
  phase: GeneratorPhase
  result: GeneratedTests | null
  /** Settings the current result was generated with. */
  resultSignature: string | null
  /** Set once this result has been added to its suite. */
  added: boolean
}

export const INITIAL_GENERATOR: GeneratorState = {
  targetId: GENERATOR_TARGETS[0].id,
  coverage: "80",
  types: ["unit", "integration", "regression"],
  phase: "idle",
  result: null,
  resultSignature: null,
  added: false,
}

export function generatorSignature(state: Pick<GeneratorState, "targetId" | "coverage" | "types">) {
  return `${state.targetId}|${state.coverage}|${[...state.types].sort().join(",")}`
}
