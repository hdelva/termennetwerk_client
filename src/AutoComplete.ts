import IQueryEmitter from "./IQueryEmitter";
import NKFD from "./normalizers/NFKD";
import QueryAgent from "./QueryAgent";
import QueryAggregator from "./QueryAggregator";
import QueryTokenizer from "./QueryTokenizer";
import ResultRanking from "./ResultRanking";
import ResultUniqueFilter from "./ResultUniqueFilter";

export default class AutoComplete extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;

    constructor(sources: string[], size: number) {
        super();

        const agents: IQueryEmitter[] = [];
        for (const source of sources) {
            agents.push(new QueryAgent(source));
        }

        const aggregator = new QueryAggregator(agents);
        const tokenizer = new QueryTokenizer(aggregator);
        const filter = new ResultUniqueFilter(tokenizer);
        const sorted = new ResultRanking(size, filter, new NKFD());
        this.subEmitter = sorted;

        this.subEmitter.on("data", (data) => this.emit("data", data));
        this.subEmitter.on("end", (data) => this.emit("end", data));
    }

    public async query(input: string) {
        this.subEmitter.query(input);
    }
}
