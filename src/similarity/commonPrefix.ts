/*
 * Length of the common prefix
 */
export default function commonPrefixSimilarity(expected: string, found: string) {
    const minLength = Math.min(expected.length, found.length);

    let common = 0;
    for (let i = 0; i < minLength; i++) {
        if (found[i] == expected[i]) {
            common += 1;
        } else {
            break;
        }
    }

    return common;
}
