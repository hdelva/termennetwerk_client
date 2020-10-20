const SortedArray = require("collections/sorted-array");

import { Quad } from "rdf-js";

import IQueryEmitter from "./IQueryEmitter";
const stringSimilarity = require('string-similarity');

export default class SortedView extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;
    protected activeQuery: string;
    protected size: number;
    protected currentBest: typeof SortedArray;

    constructor(size: number, subEmitter: IQueryEmitter) {
        super();

        this.activeQuery = "";
        this.size = size;
        this.subEmitter = subEmitter;
        this.currentBest = new SortedArray();

        const self = this;
        this.subEmitter.on("data", (q) => self.processQuad(q));
        this.subEmitter.on("end", (uri) => self.emit("end", uri));
    }

    public async query(input: string) {
        this.currentBest = new SortedArray();
        this.activeQuery = input.replace(/[^a-z]/gi,'');
        this.subEmitter.query(input);
    }

    protected processQuad(quad: Quad) {
        let similarityThreshold = 0;
        if (this.currentBest.length > 0) {
            const relevantIndex = Math.min(this.size, this.currentBest.length);
            similarityThreshold = this.currentBest.toArray()[relevantIndex - 1][0];
        }

        const value = quad.object.value.toLowerCase()
        const similarity = -1 * stringSimilarity.compareTwoStrings(this.activeQuery, value);

        if (similarity < similarityThreshold || this.currentBest.length < this.size) {
            this.currentBest.push([similarity, quad.object.value, quad]);
            this.emitUpdate();
        }
    }

    protected emitUpdate() {
        const output = this.currentBest.toArray().slice(0, this.size);
        this.emit("data", output.map((o) => o[2]));
    }
}