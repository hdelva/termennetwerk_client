import IQueryEmitter from "./IQueryEmitter";

export default class QueryAggregator extends IQueryEmitter {
    protected singleSourceAgents: IQueryEmitter[];
    protected finished: Map<string, number>;

    constructor(sourceAgents: IQueryEmitter[]) {
        super();
        this.singleSourceAgents = sourceAgents;
        this.finished = new Map();

        const self = this;
        for (const source of this.singleSourceAgents) {
            source.on("data", (q) => self.emit("data", q));
            source.on("end", (q) => self.processEnd(q));
        }
    }

    public async query(input: string) {
        for (const source of this.singleSourceAgents) {
            source.query(input);
        }
    }

    protected processEnd(query: string) {
        let count = this.finished.get(query) || 0;
        count += 1;

        if (count === this.singleSourceAgents.length) {
            this.finished.delete(query);
            this.emit("end", query);
        } else {
            this.finished.set(query, count);
        }
    }
}