import { SimilarityFunction } from "./SimilarityFunction";

export default function tokenwiseCompare(
    fun: SimilarityFunction,
    expected: string | string[],
    found: string | string[],
) {
    let score = 0;

    // tokenize the input if necessary
    let expectedTokens: string[];
    if (Array.isArray(expected)) {
        expectedTokens = expected;
    } else {
        expectedTokens = expected.trim().split(/\s/);
    }

    let foundTokens: string[];
    if (Array.isArray(found)) {
        foundTokens = found;
    } else {
        foundTokens = found.trim().split(/\s/);
    }

    // for each expected token, calculate how similar the most similar found token is
    for (const expectedToken of expectedTokens) {
        let temp = 0;
        for (const foundToken of foundTokens) {
            temp = Math.max(fun(expectedToken, foundToken), temp);
        }
        score += temp;
    }

    return score;
}