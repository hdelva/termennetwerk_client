// like the dice coefficient, but only looks for bigrams out of `expected` in `found`
// this doesn't penalize longer results if we know the `expected` string is just incomplete
export default function asymmetricDiceCoefficient(expected: string, found: string) {
    let firstBigrams = new Map();
    for (let i = 0; i < expected.length - 1; i++) {
        const bigram = expected.substring(i, i + 2);
        const count = firstBigrams.has(bigram)
            ? firstBigrams.get(bigram) + 1
            : 1;

        firstBigrams.set(bigram, count);
    };

    let intersectionSize = 0;
    for (let i = 0; i < found.length - 1; i++) {
        const bigram = found.substring(i, i + 2);
        const count = firstBigrams.has(bigram)
            ? firstBigrams.get(bigram)
            : 0;

        if (count > 0) {
            firstBigrams.set(bigram, count - 1);
            intersectionSize++;
        }
    }

    const maxIntersections = Math.max(firstBigrams.size, 1);

    return intersectionSize / maxIntersections;
}