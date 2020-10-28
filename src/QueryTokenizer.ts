import IQueryEmitter from "./IQueryEmitter";

export default class QueryTokenizer extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;

    constructor(subEmitter: IQueryEmitter) {
        super();
        this.subEmitter = subEmitter;

        const self = this;
        this.subEmitter.on("data", (q) => self.emit("data", q));
        this.subEmitter.on("reset", (q) => self.emit("reset", q));
        this.subEmitter.on("end", (uri) => self.emit("end", uri));
    }

    public async query(input: string) {
        const tokens = input.split(/\s+/).filter(Boolean);
        for (const token of tokens) {
            this.subEmitter.query(token);
        }
    }
}