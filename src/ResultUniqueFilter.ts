import { Quad } from "rdf-js";

import IQueryEmitter from "./IQueryEmitter";

export default class ResultUniqueFilter extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;
    protected known: Set<string>;

    constructor(sourceAgents: IQueryEmitter) {
        super();
        this.subEmitter = sourceAgents;
        this.known = new Set();

        const self = this;
        this.subEmitter.on("data", (q) => self.processQuad(q));
        this.subEmitter.on("end", (uri) => self.emit("end", uri));
    }

    public async query(input: string) {
        this.known = new Set();
        this.subEmitter.query(input);
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