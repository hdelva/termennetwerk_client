import { Quad } from "rdf-js";
import { FilterFunction, SimilarityFunction } from "./SimilarityFunction";

export default class SimilarityConfiguration {
    private similarityFunction: SimilarityFunction;
    private filterFunction?: FilterFunction;

    constructor(similarity: SimilarityFunction, filter?: FilterFunction) {
        this.similarityFunction = similarity;
        this.filterFunction = filter;
    }

    public evaluate(expected: string, found: string, quad?: Quad): number {
        // higher is better
        // NaN indicates an ineligible result
        const similarity = this.similarityFunction(expected, found, quad);

        if (this.filterFunction) {
            if (!this.filterFunction(expected, found, similarity)) {
                return NaN;
            }
        }

        return similarity;
    }
}
