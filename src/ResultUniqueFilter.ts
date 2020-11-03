import { Quad } from "rdf-js";

import ResultEmitter from "./ResultEmitter";

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
        this.subEmitter.on("data", (q) => self.processQuad(q));
        this.subEmitter.on("end", (uri) => self.emit("end", uri));
        this.subEmitter.on("reset", () => self.emit("reset"));
    }

    public async query(input: string) {
        this.emit("reset");
        this.known = new Set();
        this.subEmitter.query(input);
    }

    public resolveSubject(uri: string): Quad[] {
        return this.subEmitter.resolveSubject(uri);
    }

    protected processQuad(quad: Quad) {
        const uri = quad.subject.value;
        const value = quad.object.value;

        if (!this.known.has(uri + value)) {
            this.known.add(uri + value);
            this.emit("data", quad);
        }
    }
}