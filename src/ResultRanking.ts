const SortedArray = require("collections/sorted-array");

import { Quad } from "rdf-js";

import ResultEmitter from "./ResultEmitter";
import INormalizer from "./normalizers/INormalizer";
import SimilarityConfiguration from "./similarity/SimilarityConfiguration";
import ResultMetadata from "./ResultMetadata";

/*
 * Emits only the most relevant results from the subEmitter
 * Emits "reset" events each time the top N results changes, 
 * followed by "data" events for each result in the top N 
 */
export default class ResultRanking extends ResultEmitter {
    protected subEmitter: ResultEmitter;
    protected normalizedQuery: string;
    protected rawQuery: string;
    protected size: number;
    protected currentBest: typeof SortedArray;
    protected similarityConfigurations: SimilarityConfiguration[];

    protected normalizer: INormalizer;

    constructor(
        size: number,
        subEmitter: ResultEmitter,
        normalizer: INormalizer,
        similarityConfigurations: SimilarityConfiguration[],
    ) {
        super();

        this.size = size;
        this.normalizer = normalizer;
        this.similarityConfigurations = similarityConfigurations;

        this.normalizedQuery = "";
        this.rawQuery = "";
        this.currentBest = new SortedArray();

        const self = this;
        this.subEmitter = subEmitter;
        this.subEmitter.on("data", (q, _) => self.processQuad(q)); // ignore existing metadata, we add our own
        this.subEmitter.on("end", (meta) => self.emit("end", meta));
    }

    public async query(input: string) {
        const normalizedInput = this.normalizer.normalize(input);

        if (this.normalizedQuery === normalizedInput) {
            this.emitUpdate(input);
        } else {
            this.emit("reset", new ResultMetadata(input));
            this.currentBest = new SortedArray();
            this.rawQuery = input;
            this.normalizedQuery = normalizedInput;
            this.subEmitter.query(input);
        }
    }

    protected processQuad(quad: Quad) {
        let thresholdVector = undefined;
        if (this.currentBest.length > 0) {
            const relevantIndex = Math.min(this.size, this.currentBest.length);
            thresholdVector = this.currentBest.toArray()[relevantIndex - 1];
        }

        let rawValue = quad.object.value;
        let normalizedValue = this.normalizer.normalize(rawValue);

        let better = false;
        let eligible = true;
        let similarityVector: number[] = [];
        for (let i = 0; i < this.similarityConfigurations.length; i++) {
            const configuration = this.similarityConfigurations[i];

            // flip sign, because we order increasingly
            let similarity = -1 * configuration.evaluate(this.normalizedQuery, normalizedValue, quad);

            // it's not similar enough to include in the results
            if (isNaN(similarity)) {
                eligible = false;
                break;
            }

            if (
                !thresholdVector ||
                similarity < thresholdVector[i] ||
                this.currentBest.length < this.size
            ) {
                better = true;
            }

            if (better || thresholdVector && similarity === thresholdVector[i]) {
                similarityVector.push(similarity);
            } else {
                // not an improvement, stop evaluating
                break;
            }
        }

        // if all configured metrics are as good as the threshold value
        if (eligible && similarityVector.length === this.similarityConfigurations.length) {
            const overlapVector = this.findOverlap(this.rawQuery, rawValue);

            // add the string value and quad object as tie breakers
            const fullVector = [...similarityVector, normalizedValue, overlapVector, quad];

            let better = this.currentBest.contentCompare(thresholdVector, fullVector) > 0;

            if (better || this.currentBest.length < this.size) {
                this.currentBest.push(fullVector);
                this.emitUpdate(this.rawQuery);
            }
        }
    }

    public resolveSubject(uri: string): Quad[] {
        return this.subEmitter.resolveSubject(uri);
    }

    protected findOverlap(expected: string, found: string): Array<[number, number]> {
        const result: Array<[number, number]> = [];
        const expectedTokens = expected.trim().split(/\s/);
        const foundTokens = found.trim().split(/\s/);

        for (const expectedToken of expectedTokens) {
            const normalizedExpected = this.normalizer.normalize(expectedToken);
            for (const foundToken of foundTokens) {
                const normalizedFound = this.normalizer.normalize(foundToken);

                if (normalizedFound.startsWith(normalizedExpected)) {
                    let beginIndex = found.indexOf(foundToken)

                    let currentToken = this.normalizer.normalize(found[beginIndex]);
                    while (currentToken && currentToken !== normalizedFound[0]) {
                        beginIndex += 1;
                        currentToken = this.normalizer.normalize(found[beginIndex]);
                    }

                    let endIndex = beginIndex + normalizedExpected.length - 1;
                    currentToken = this.normalizer.normalize(found[endIndex]);
                    while (currentToken && currentToken !== normalizedFound[normalizedExpected.length - 1]) {
                        endIndex += 1;
                        currentToken = this.normalizer.normalize(found[endIndex]);
                    }

                    if (beginIndex < found.length && beginIndex <= endIndex) {
                        result.push([beginIndex, endIndex]);
                    }
                }
            }
        }


        return result;
    }

    protected emitUpdate(query: string) {
        this.emit("reset", new ResultMetadata(this.rawQuery));
        const output = this.currentBest.toArray().slice(0, this.size);
        for (const vector of output) {
            const quad = vector[vector.length - 1];
            const overlapVector = vector[vector.length - 2];
            const similarityVector = vector.slice(0, vector.length - 2);
            this.emit("data", quad, new ResultMetadata(query, overlapVector, similarityVector));
        }
    }
}