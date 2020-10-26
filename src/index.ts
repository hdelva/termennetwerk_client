
import IQueryEmitter from "./IQueryEmitter";
import QueryAgent from "./QueryAgent";
import QueryAggregator from "./QueryAggregator";
import QueryNormalizer from "./QueryNormalizer";
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
        const tokenizer = new QueryTokenizer(aggregator);
        const filter = new UniqueFilter(tokenizer);
        const sorted = new SortedView(size, filter);
        const normalizer = new QueryNormalizer(sorted);
        this.subEmitter = normalizer;

        this.subEmitter.on("data", (data) => this.emit("data", data));
        this.subEmitter.on("end", (data) => this.emit("end", data));
    }

    public async query(input: string) {
        this.subEmitter.query(input);
    }
}

/*
const x = new AutoComplete([
    "https://termen.opoi.org/nta",
    "https://termen.opoi.org/rkdartists",
    "https://termen.opoi.org/cht",
    "https://termen.opoi.org/vtmk"],
    10);

x.on("data", (d) => {
    for (const a of d) {
        // /console.log(a.object.value);
    }
    //console.log("");
});
//x.query("Métérié");
x.query("vincent van go");
*/