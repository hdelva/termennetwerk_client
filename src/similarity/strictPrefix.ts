/*
 * If `found` is a prefix of `expected`, return the former's length
 */
export default function strictPrefixSimilarity(expected: string, found: string) {
    if (expected.startsWith(found)) {
        return found.length;
    }

    return 0;
}
