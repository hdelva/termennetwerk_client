
import IQueryEmitter from "./IQueryEmitter";
import QueryAgent from "./QueryAgent";
import QueryAggregator from "./QueryAggregator";
import QueryTokenizer from "./QueryTokenizer";
import SortedView from "./SortedView";
import UniqueFilter from "./UniqueFilter";

export default class AutoComplete extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;

    constructor(sources: string[], size: number) {
        super();

        const agents: IQueryEmitter[] = [];
        for (const source of sources) {
            agents.push(new QueryAgent(source));
        }

        const aggregator = new QueryAggregator(agents);
        const normalizer = new QueryTokenizer(aggregator);
        const filter = new UniqueFilter(normalizer);
        const sorted = new SortedView(size, filter);
        this.subEmitter = sorted;

        this.subEmitter.on("data", (data) => this.emit("data", data));
        this.subEmitter.on("end", (data) => this.emit("end", data));
    }

    public async query(input: string) {
        this.subEmitter.query(input);
    }
}
