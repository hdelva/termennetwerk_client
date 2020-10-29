import IQueryEmitter from "./IQueryEmitter";
import NKFD from "./normalizers/NFKD";
import QueryAgent from "./QueryAgent";
import QueryAggregator from "./QueryAggregator";
import ResultRanking from "./ResultRanking";
import ResultUniqueFilter from "./ResultUniqueFilter";
import asymmetricDiceCoefficient from "./similarity/asymmetricDiceCoefficient";
import { commonPrefixSimilarity } from "./similarity/commonPrefix";
import { SimilarityConfiguration } from "./similarity/SimilarityConfiguration";
import strictPrefixSimilarity from "./similarity/strictPrefix";
import tokenwiseCompare from "./similarity/tokenwise";

function strictRelationPrefix(expected: string, found: string): number {
    return tokenwiseCompare(strictPrefixSimilarity, expected, found);
}

function strictResultPrefix(expected: string, found: string): number {
    // flip expected and found
    // we want `expected` to be a prefix of `found` 
    return tokenwiseCompare(strictPrefixSimilarity, found, expected);
}

function prefixResultFilter(expected: string, found: string, similarity: number): boolean {
    return expected.replace(/\p{Z}/gu, "").length === similarity;
}

function prefixResult(expected: string, found: string): number {
    return tokenwiseCompare(commonPrefixSimilarity, expected, found);
}

function diceResult(expected: string, found: string): number {
    return tokenwiseCompare(asymmetricDiceCoefficient, expected, found);
}

function lengthResult(expected: string, found: string): number {
    return -1 * found.length;
}

const fuzzyConfig = [
    new SimilarityConfiguration(prefixResult),
    new SimilarityConfiguration(diceResult),
    new SimilarityConfiguration(lengthResult),
]

const strictConfig = [
    new SimilarityConfiguration(strictResultPrefix, prefixResultFilter),
    new SimilarityConfiguration(diceResult),
    new SimilarityConfiguration(lengthResult),
]

const strictRelationConfig = [
    new SimilarityConfiguration(strictRelationPrefix),
]

export default class AutoComplete extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;

    constructor(sources: string[], size: number) {
        super();

        const agents: IQueryEmitter[] = [];
        for (const source of sources) {
            agents.push(new QueryAgent(source, strictRelationConfig));
        }

        const aggregator = new QueryAggregator(agents);
        const filter = new ResultUniqueFilter(aggregator);

        const sorted = new ResultRanking(
            size,
            filter,
            new NKFD(),
            strictConfig
        );
        this.subEmitter = sorted;

        this.subEmitter.on("data", (data) => this.emit("data", data));
        this.subEmitter.on("end", (data) => this.emit("end", data));
        this.subEmitter.on("reset", () => this.emit("reset"));
    }

    public async query(input: string) {
        this.subEmitter.query(input);
    }
}
