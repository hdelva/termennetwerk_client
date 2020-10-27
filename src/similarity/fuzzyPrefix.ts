import { commonPrefixSimilarity } from "./commonPrefix";
import fuzzyIndexSimilarity from "./fuzzyIndex";

/*
 * Sum of the commonPrefixSimilarity and fuzzyIndexSimilarity functions
 */
export function fuzzyPrefixSimilarity(expected: string, found: string) {
    return commonPrefixSimilarity(expected, found) + fuzzyIndexSimilarity(expected, found);
}
