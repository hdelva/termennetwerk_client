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
    // one of the expected tokens has been matched, so this relation can be relevant
    return similarity > 0;
}

// returns how many of the `expected` string's tokens are present in the `found` string
// it allows 1 token be incomplete if it is a prefix
function strictResultPrefix(expected: string, found: string): number {
    const maxPrefixTolerance = 1; // how many prefix matches do we tolerate
    let prefixTolerance = 0; // how many prefix matches do we have so far

    // count how many times we expect to find each token
    let expectedTokens: Map<string, number> = new Map();
    for (const token of expected.trim().split(/\s/)) {
        const count = expectedTokens.get(token) || 0;
        expectedTokens.set(token, count + 1);
    }

    const foundTokens = found.trim().split(/\s/);

    let score = 0;
    for (const [token, expectedCount] of expectedTokens.entries()) {
        let count = 0;
        for (const foundToken of foundTokens) {
            if (foundToken === token) {
                count ++;
            } else if (prefixTolerance < maxPrefixTolerance && foundToken.startsWith(token)) {
                prefixTolerance++;
                count++;
            }
        }
        if (count >= expectedCount) {
            score += expectedCount;
        }
    }

    return score;
}

function prefixResultFilter(expected: string, found: string, similarity: number): boolean {
    // each token must be accounted for
    return expected.trim().split(/\s/).length === similarity;
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
        this.subEmitter.on("end", (meta) => this.emit("end", meta));
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
