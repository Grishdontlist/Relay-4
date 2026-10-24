import { sampleData } from "./mockData";
import type { Snapshot } from "./types";
// Replace this adapter when backend contracts are agreed. No endpoint assumptions.
export const simulationApi = {
  async load(): Promise<Snapshot> {
    return structuredClone(sampleData);
  },
};
