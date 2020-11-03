// bigger is better, NaN is ineligible
export type SimilarityFunction = (expected: string, found: string) => number;

// return true if this similarity is good enough, false if not
export type FilterFunction = (expected: string, found: string, similarity: number) => boolean;
