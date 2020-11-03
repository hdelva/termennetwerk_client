const SortedArray = require("collections/sorted-array");

import { Quad } from "rdf-js";

import ResultEmitter from "./ResultEmitter";
import INormalizer from "./normalizers/INormalizer";
import SimilarityConfiguration from "./similarity/SimilarityConfiguration";

/*
 * Emits only the most relevant results from the subEmitter
 * Emits "reset" events each time the top N results changes, 
 * followed by "data" events for each result in the top N 
 */
export default class ResultRanking extends ResultEmitter {
    protected subEmitter: ResultEmitter;
    protected activeQuery: string;
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

        this.activeQuery = "";
        this.currentBest = new SortedArray();

        const self = this;
        this.subEmitter = subEmitter;
        this.subEmitter.on("data", (q) => self.processQuad(q));
        this.subEmitter.on("end", (uri) => self.emit("end", uri));
        this.subEmitter.on("reset", () => self.emit("reset"));
    }

    public async query(input: string) {
        this.emit("reset");
        this.currentBest = new SortedArray();
        input = this.normalizer.normalize(input);

        this.activeQuery = input;
        this.subEmitter.query(input);
    }

    protected processQuad(quad: Quad) {
        let thresholdVector = undefined;
        if (this.currentBest.length > 0) {
            const relevantIndex = Math.min(this.size, this.currentBest.length);
            thresholdVector = this.currentBest.toArray()[relevantIndex - 1];
        }

        let value = this.normalizer.normalize(quad.object.value);

        let better = false;
        let eligible = true;
        let similarityVector: number[] = [];
        for (let i = 0; i < this.similarityConfigurations.length; i++) {
            const configuration = this.similarityConfigurations[i];

            // flip sign, because we order increasingly
            let similarity = -1 * configuration.evaluate(this.activeQuery, value);

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

        if (eligible && similarityVector.length === this.similarityConfigurations.length) {
            // all configured metrics are as good as the threshold value
            // add the string value and quad object as tie breakers
            const fullVector = [...similarityVector, value, quad];

            let better = this.currentBest.contentCompare(thresholdVector, fullVector) > 0;

            if (better || this.currentBest.length < this.size) {
                this.currentBest.push(fullVector);
                this.emitUpdate();
            }
        }
    }

    public resolveSubject(uri: string): Quad[] {
        return this.subEmitter.resolveSubject(uri);
    }

    protected emitUpdate() {
        this.emit("reset");
        const output = this.currentBest.toArray().slice(0, this.size);
        for (const vector of output) {
            this.emit("data", vector[vector.length - 1]);
        }
    }
}