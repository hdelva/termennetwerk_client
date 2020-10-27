import { SimilarityFunction } from "./SimilarityFunction";

export default function tokenwiseCompare(fun: SimilarityFunction, expected: string, found: string) {
    let score = 0;

    const expectedTokens = expected.split(/\s/);
    const foundTokens = found.split(/\s/);

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