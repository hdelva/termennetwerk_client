const SortedArray = require("collections/sorted-array");

import { Quad } from "rdf-js";

import IQueryEmitter from "./IQueryEmitter";
import INormalizer from "./normalizers/INormalizer";
import { SimilarityConfiguration } from "./similarity/SimilarityConfiguration";

export default class ResultRanking extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;
    protected activeQuery: string;
    protected size: number;
    protected currentBest: typeof SortedArray;
    protected similarityConfigurations: SimilarityConfiguration[];

    protected normalizer: INormalizer;

    constructor(
        size: number,
        subEmitter: IQueryEmitter,
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
    }

    public async query(input: string) {
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

        if (value == "frank anne") {
            let i = 0;
        }

        let better = false;
        let similarityVector: number[] = [];
        for (let i = 0; i < this.similarityConfigurations.length; i++) {
            const configuration = this.similarityConfigurations[i];

            // flip sign, because we order increasingly
            const similarity = -1 * configuration.evaluate(this.activeQuery, value);

            if (
                !thresholdVector // everything is better than nothing
                || similarity < thresholdVector[i] // an actual improvement
            ) {
                better = true;
            }

            if (
                better // we're competing the vector
                || thresholdVector && similarity === thresholdVector[i] // still a tie 
            ) {
                similarityVector.push(similarity);
            } else {
                // not an improvement, stop evaluating
                break;
            }
        }

        if (similarityVector.length === this.similarityConfigurations.length) {
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

    protected emitUpdate() {
        const output = this.currentBest.toArray().slice(0, this.size);
        this.emit("data", output.map((o) => o[o.length - 1]));
    }
}