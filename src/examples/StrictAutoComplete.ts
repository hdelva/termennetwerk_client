import IQueryEmitter from "../ResultEmitter";
import NKFD from "../normalizers/NFKD";
import QueryAgent from "../QueryAgent";
import QueryAggregator from "../QueryAggregator";
import ResultRanking from "../ResultRanking";
import ResultStore from "../ResultStore";
import ResultUniqueFilter from "../ResultUniqueFilter";
import asymmetricDiceCoefficient from "../similarity/asymmetricDiceCoefficient";
import SimilarityConfiguration from "../similarity/SimilarityConfiguration";
import strictPrefixSimilarity from "../similarity/strictPrefix";
import tokenwiseCompare from "../similarity/tokenwise";
import { Quad } from "rdf-js";
import ResultMetadata from "../ResultMetadata";

function strictRelationPrefix(expected: string, found: string): number {
    return tokenwiseCompare(strictPrefixSimilarity, expected, found);
}

function strictRelationFilter(expected: string, found: string, similarity: number): boolean {
    return similarity > 0;
}

function strictResultPrefix(expected: string, found: string): number {
    // flip expected and found
    // we want `expected` to be a prefix of `found` 
    return tokenwiseCompare(strictPrefixSimilarity, found, expected);
}

function prefixResultFilter(expected: string, found: string, similarity: number): boolean {
    return expected.replace(/\p{Z}/gu, "").length === similarity;
}

function diceResult(expected: string, found: string): number {
    return tokenwiseCompare(asymmetricDiceCoefficient, expected, found);
}

function lengthResult(expected: string, found: string, quad?: Quad): number {
    return quad ? -1 * quad.object.value.length : -1 * found.length;
}

const strictConfig = [
    new SimilarityConfiguration(strictResultPrefix, prefixResultFilter),
    new SimilarityConfiguration(diceResult),
    new SimilarityConfiguration(lengthResult),
]

const strictRelationConfig = [
    new SimilarityConfiguration(strictRelationPrefix, strictRelationFilter),
]

export default class StrictAutoComplete extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;

    constructor(sources: string[], size: number) {
        super();

        const agents: IQueryEmitter[] = [];
        for (const source of sources) {
            agents.push(new QueryAgent(source, strictRelationConfig));
        }

        const aggregator = new QueryAggregator(agents);
        const store = new ResultStore(aggregator);
        const filter = new ResultUniqueFilter(store);

        const sorted = new ResultRanking(
            size,
            filter,
            new NKFD(),
            strictConfig
        );
        this.subEmitter = sorted;

        this.subEmitter.on("data", (data, meta) => this.emit("data", data, meta));
        this.subEmitter.on("end", (data) => this.emit("end", data));
        this.subEmitter.on("reset", (meta) => this.emit("reset", meta));
    }

    public async query(input: string) {
        this.emit("reset", new ResultMetadata(input));
        this.subEmitter.query(input);
    }

    public resolveSubject(uri: string): Quad[] {
        return this.subEmitter.resolveSubject(uri);
    }
}
