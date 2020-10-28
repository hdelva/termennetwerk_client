import { FilterFunction, SimilarityFunction } from "./SimilarityFunction";

export class SimilarityConfiguration {
    private similarityFunction: SimilarityFunction;
    private filterFunction?: FilterFunction;

    constructor(similarity: SimilarityFunction, filter?: FilterFunction) {
        this.similarityFunction = similarity;
        this.filterFunction = filter;
    }

    public evaluate(expected: string, found: string) {
        const similarity = this.similarityFunction(expected, found);

        if (this.filterFunction) {
            if (!this.filterFunction(expected, found, similarity)) {
                return NaN;
            }
        }

        return similarity;
    }
}
