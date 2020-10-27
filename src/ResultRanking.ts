const SortedArray = require("collections/sorted-array");

import { Quad } from "rdf-js";

import IQueryEmitter from "./IQueryEmitter";
import INormalizer from "./normalizers/INormalizer";

type SimilarityFunction = (a: string, b: string) => number[];

function asymetricCompare(expected: string, found: string) {
    if (!expected.length || !found.length) {
        return [0, 0, found.length];
    };

    const expectedTokens = expected.split(/\s/);
    const foundTokens = found.split(/\s/);

    let score = 0;
    for (const expectedToken of expectedTokens) {
        for (const foundToken of foundTokens) {
            if (foundToken.startsWith(expectedToken)) {
                score += 1;
                break;
            }
        }
    }

    let firstBigrams = new Map();
    for (const expectedToken of expectedTokens) {
        for (let i = 0; i < expectedToken.length - 1; i++) {
            const bigram = expectedToken.substring(i, i + 2);
            const count = firstBigrams.has(bigram)
                ? firstBigrams.get(bigram) + 1
                : 1;

            firstBigrams.set(bigram, count);
        };
    }

    let intersectionSize = 0;
    for (const foundToken of foundTokens) {
        for (let i = 0; i < foundToken.length - 1; i++) {
            const bigram = foundToken.substring(i, i + 2);
            const count = firstBigrams.has(bigram)
                ? firstBigrams.get(bigram)
                : 0;

            if (count > 0) {
                firstBigrams.set(bigram, count - 1);
                intersectionSize++;
            }
        }
    }

    const maxIntersections = Math.max(firstBigrams.size, 1)

    return [-1 * score, -1 * intersectionSize / maxIntersections, found.length];
}

export default class ResultRanking extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;
    protected activeQuery: string;
    protected size: number;
    protected currentBest: typeof SortedArray;
    protected similarityFunction: SimilarityFunction;

    protected normalizer: INormalizer;

    constructor(
        size: number,
        subEmitter: IQueryEmitter,
        normalizer: INormalizer,
        similarityFunction?: SimilarityFunction,
    ) {
        super();

        this.size = size;
        this.normalizer = normalizer;
        this.similarityFunction = similarityFunction || asymetricCompare;

        this.activeQuery = "";
        this.currentBest = new SortedArray();

        const self = this;
        this.subEmitter = subEmitter;
        this.subEmitter.on("data", (q) => self.processQuad(q));
        this.subEmitter.on("end", (uri) => self.emit("end", uri));
    }

    public async query(input: string) {
        this.currentBest = new SortedArray();

        input = this.normalizer.normalize(input);

        this.activeQuery = input;
        this.subEmitter.query(input);
    }

    protected processQuad(quad: Quad) {
        let threshold = [];
        if (this.currentBest.length > 0) {
            const relevantIndex = Math.min(this.size, this.currentBest.length);
            threshold = this.currentBest.toArray()[relevantIndex - 1];
        }

        let value = this.normalizer.normalize(quad.object.value);

        const similarity = this.similarityFunction(this.activeQuery, value);
        const competitor = [...similarity, quad.object.value.toLocaleLowerCase(), quad];

        let better = this.currentBest.contentCompare(threshold, competitor) > 0;

        if (better || this.currentBest.length < this.size) {
            this.currentBest.push(competitor);
            this.emitUpdate();
        }
    }

    protected emitUpdate() {
        const output = this.currentBest.toArray().slice(0, this.size);
        this.emit("data", output.map((o) => o[o.length - 1]));
    }
}