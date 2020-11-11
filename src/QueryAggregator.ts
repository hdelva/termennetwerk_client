import ResultEmitter from "./ResultEmitter";
import { Quad } from "rdf-js";
import ResultMetadata from "./ResultMetadata";

/*
 * Merges results from multiple other emitters
 */
export default class QueryAggregator extends ResultEmitter {
    protected subEmitters: ResultEmitter[];
    protected finished: Map<string, number>;

    constructor(subEmitters: ResultEmitter[]) {
        super();
        this.subEmitters = subEmitters;
        this.finished = new Map();

        const self = this;
        for (const source of this.subEmitters) {
            source.on("data", (q, meta) => self.emit("data", q, meta));
            source.on("end", (meta) => self.processEnd(meta));
        }
    }

    public async query(input: string) {
        this.emit("reset", new ResultMetadata(input));
        for (const source of this.subEmitters) {
            source.query(input);
        }
    }

    public resolveSubject(uri: string): Quad[] {
        let result: Quad[] = [];
        for (const source of this.subEmitters) {
            result = result.concat(source.resolveSubject(uri));
        }
        return result;
    }

    protected processEnd(meta: ResultMetadata) {
        const query = meta.query;
        if (query) {
            let count = this.finished.get(query) || 0;
            count += 1;

            if (count === this.subEmitters.length) {
                this.finished.delete(query);
                this.emit("end", new ResultMetadata(query));
            } else {
                this.finished.set(query, count);
            }
        }
    }
}