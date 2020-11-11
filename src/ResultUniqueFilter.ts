import { Quad } from "rdf-js";

import ResultEmitter from "./ResultEmitter";
import ResultMetadata from "./ResultMetadata";

/*
 * The same value can be in multiple pages across multiple datasets
 * Avoid duplicate results by just slapping a unique filter in there
 */
export default class ResultUniqueFilter extends ResultEmitter {
    protected subEmitter: ResultEmitter;
    protected known: Set<string>;

    constructor(sourceAgents: ResultEmitter) {
        super();
        this.subEmitter = sourceAgents;
        this.known = new Set();

        const self = this;
        this.subEmitter.on("data", (q, meta) => self.processQuad(q, meta));
        this.subEmitter.on("end", (meta) => self.emit("end", meta));
    }

    public async query(input: string) {
        this.emit("reset", new ResultMetadata(input));
        this.known = new Set();
        this.subEmitter.query(input);
    }

    public resolveSubject(uri: string): Quad[] {
        return this.subEmitter.resolveSubject(uri);
    }

    protected processQuad(quad: Quad, meta: ResultMetadata) {
        const uri = quad.subject.value;
        const value = quad.object.value;

        if (!this.known.has(uri + value)) {
            this.known.add(uri + value);
            this.emit("data", quad, meta);
        }
    }
}