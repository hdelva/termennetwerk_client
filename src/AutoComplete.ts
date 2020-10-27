import IQueryEmitter from "./IQueryEmitter";
import NKFD from "./normalizers/NFKD";
import QueryAgent from "./QueryAgent";
import QueryAggregator from "./QueryAggregator";
import QueryTokenizer from "./QueryTokenizer";
import ResultRanking from "./ResultRanking";
import ResultUniqueFilter from "./ResultUniqueFilter";
import asymmetricDiceCoefficient from "./similarity/asymmetricDiceCoefficient";
import { commonPrefixSimilarity } from "./similarity/commonPrefix";
import { SimilarityConfiguration } from "./similarity/SimilarityConfiguration";
import strictPrefixSimilarity from "./similarity/strictPrefix";
import tokenwiseCompare from "./similarity/tokenwise";

function strictPrefix(expected: string, found: string): number {
    // flip expected and found
    // we want `expected` to be a prefix of `found` 
    return tokenwiseCompare(strictPrefixSimilarity, found, expected);
}

function prefix(expected: string, found: string): number {
    return tokenwiseCompare(commonPrefixSimilarity, expected, found);
}

function dice(expected: string, found: string): number {
    return tokenwiseCompare(asymmetricDiceCoefficient, expected, found);
}

function length(expected: string, found: string): number {
    return -1 * found.length;
}

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

        const sorted = new ResultRanking(
            size,
            filter,
            new NKFD(),
            [
                new SimilarityConfiguration(prefix),
                new SimilarityConfiguration(dice),
                new SimilarityConfiguration(length),
            ]
        );
        this.subEmitter = sorted;

        this.subEmitter.on("data", (data) => this.emit("data", data));
        this.subEmitter.on("end", (data) => this.emit("end", data));
    }

    public async query(input: string) {
        this.subEmitter.query(input);
    }
}
