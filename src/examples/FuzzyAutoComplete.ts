import IQueryEmitter from "../ResultEmitter";
import NKFD from "../normalizers/NFKD";
import QueryAgent from "../QueryAgent";
import QueryAggregator from "../QueryAggregator";
import ResultRanking from "../ResultRanking";
import ResultStore from "../ResultStore";
import ResultUniqueFilter from "../ResultUniqueFilter";
import asymmetricDiceCoefficient from "../similarity/asymmetricDiceCoefficient";
import commonPrefixSimilarity from "../similarity/commonPrefix";
import SimilarityConfiguration from "../similarity/SimilarityConfiguration";
import tokenwiseCompare from "../similarity/tokenwise";
import { Quad } from "rdf-js";
import fuzzyIndexSimilarity from "../similarity/fuzzyIndex";
import ResultMetadata from "../ResultMetadata";

function fuzzyRelationIndex(expected: string, found: string): number {
    return tokenwiseCompare(fuzzyIndexSimilarity, expected, found);
}

function strictRelationFilter(expected: string, found: string, similarity: number): boolean {
    return similarity > 0;
}

function prefixResult(expected: string, found: string): number {
    return tokenwiseCompare(commonPrefixSimilarity, expected, found);
}

function diceResult(expected: string, found: string): number {
    return tokenwiseCompare(asymmetricDiceCoefficient, expected, found);
}

function lengthResult(expected: string, found: string, quad?: Quad): number {
    return quad ? -1 * quad.object.value.length : -1 * found.length;
}

const fuzzyConfig = [
    new SimilarityConfiguration(prefixResult),
    new SimilarityConfiguration(diceResult),
    new SimilarityConfiguration(lengthResult),
]

const fuzzyRelationConfig = [
    new SimilarityConfiguration(fuzzyRelationIndex, strictRelationFilter),
]

export default class FuzzyAutoComplete extends IQueryEmitter {
    protected subEmitter: IQueryEmitter;

    constructor(sources: string[], size: number) {
        super();

        const agents: IQueryEmitter[] = [];
        for (const source of sources) {
            agents.push(new QueryAgent(source, fuzzyRelationConfig));
        }

        const aggregator = new QueryAggregator(agents);
        const store = new ResultStore(aggregator);
        const filter = new ResultUniqueFilter(store);

        const sorted = new ResultRanking(
            size,
            filter,
            new NKFD(),
            fuzzyConfig
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
