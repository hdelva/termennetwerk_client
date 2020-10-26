import IQueryEmitter from "./IQueryEmitter";

export default class QueryNormalizer extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;

    constructor(subEmitter: IQueryEmitter) {
        super();
        this.subEmitter = subEmitter;

        const self = this;
        this.subEmitter.on("data", (q) => self.emit("data", q));
        this.subEmitter.on("end", (uri) => self.emit("end", uri));
    }

    public async query(input: string) {
        
        this.subEmitter.query(input);
    }
}