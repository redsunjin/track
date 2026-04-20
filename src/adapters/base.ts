import type { IntermediateRoadmapSchema } from "../adapter-schema.js";

/**
 * The core contract for all external roadmap adapters.
 * Every new source (GitHub, Notion, etc.) must implement this interface.
 */
export interface RoadmapAdapter {
  /**
   * The unique identifier for the source type (e.g., "github", "notion").
   */
  readonly sourceKind: string;

  /**
   * Fetches data from the external service.
   * This method is responsible for handling authentication and API calls.
   *
   * @throws Error if fetching fails or authentication is invalid.
   */
  fetch(): Promise<void>;

  /**
   * Transforms the fetched source-specific data into the standard
   * IntermediateRoadmapSchema.
   *
   * @returns The standardized schema ready for projection into Track files.
   */
  toInternalSchema(): Promise<IntermediateRoadmapSchema>;
}

/**
 * A simple mock implementation for testing purposes.
 */
export class MockRoadmapAdapter implements RoadmapAdapter {
  readonly sourceKind = "mock";
  private data?: IntermediateRoadmapSchema;

  constructor(data: IntermediateRoadmapSchema) {
    this.data = data;
  }

  async fetch(): Promise<void> {
    // No-op for mock
  }

  async toInternalSchema(): Promise<IntermediateRoadmapSchema> {
    if (!this.data) {
      throw new Error("No data loaded in MockRoadmapAdapter");
    }
    return this.data;
  }
}
