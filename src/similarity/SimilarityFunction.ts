// semantics of return is bigger = better
export type SimilarityFunction = (expected: string, found: string) => number;
export type FilterFunction = (expected: string, found: string, similarity: number) => boolean;
