import LDFetch from "ldfetch";
import { Quad } from "rdf-js";
import TinyQueue from "tinyqueue";

import IQueryEmitter from "./IQueryEmitter";
import { commonPrefixSimilarity } from "./similarity/commonPrefix";
import strictPrefixSimilarity from "./similarity/strictPrefix";

class RankedRelation {
    public uri: string;
    public score: number;

    constructor(uri, score) {
        this.uri = uri;
        this.score = score;
    }
}

type SimilarityFunction = (a: string, b: string) => number;

export default class QueryAgent extends IQueryEmitter {
    protected source: string;
    protected fetcher: LDFetch;
    protected activeQueries: Set<string>;
    protected stringSimilarity: SimilarityFunction;
    protected knownRelations: Map<string, string>; // URI -> value

    constructor(source: string, similarityFunction?: SimilarityFunction) {
        super();
        this.source = source;
        this.fetcher = new LDFetch();
        this.activeQueries = new Set();
        this.knownRelations = new Map();
        this.stringSimilarity = similarityFunction || strictPrefixSimilarity;

        this.prefetch();
    }

    private async prefetch() {
        const data = await this.fetcher.get(this.source);

        const nodes = {};
        const nodeValues = {};

        for (const untyped_quad of data.triples) {
            const quad: Quad = untyped_quad;

            if (quad.predicate.value == "https://w3id.org/tree#node") {
                nodes[quad.subject.value] = quad.object.value;
            } else if (quad.predicate.value == "https://w3id.org/tree#value") {
                nodeValues[quad.subject.value] = quad.object.value;
            }
        }

        for (const key of Object.keys(nodes)) {
            const value = nodeValues[key];
            this.knownRelations.set(nodes[key], value);
        }
    }

    public async query(input: string)  {
        // signal other components to reset their internal state
        this.emit("reset");

        for (const runningQuery of this.activeQueries) {
            if (input.startsWith(runningQuery) || runningQuery.startsWith(input)) {
                // this query has been changed
                this.activeQueries.delete(runningQuery);
            }
        }
        this.activeQueries.add(input);

        const queue: TinyQueue<RankedRelation> = new TinyQueue([], (a: RankedRelation, b: RankedRelation) => {
            return b.score - a.score;
        });

        let bestSimilarity = 0;
        queue.push(new RankedRelation(this.source, 0));
        for (const [uri, value] of this.knownRelations.entries()) {
            const similarity = this.stringSimilarity(input, value);
            if (similarity >= bestSimilarity) {
                queue.push(new RankedRelation(uri, similarity));
                bestSimilarity = similarity;
            }
        }

        while (queue.length > 0) {
            if (!this.activeQueries.has(input)) {
                break;
            }
            const blob = queue.pop();
            if (!blob) {
                continue;
            }
            const {uri: page, score} = blob;
            if (score < bestSimilarity) {
                continue;
            }
            const data = await this.fetcher.get(page);

            const nodes = {};
            const nodeValues = {};

            for (const untyped_quad of data.triples) {
                const quad: Quad = untyped_quad;

                if (quad.predicate.value == "https://w3id.org/tree#node") {
                    nodes[quad.subject.value] = quad.object.value;
                } else if (quad.predicate.value == "https://w3id.org/tree#value") {
                    nodeValues[quad.subject.value] = quad.object.value;
                } else if (quad.object.termType == "Literal" && quad.subject.termType === "NamedNode") {
                    const dataType = quad.object.datatype.value;

                    if (dataType == "http://www.w3.org/2001/XMLSchema#string" || dataType == "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString") {
                        this.emit("data", quad);
                    }
                }
            }

            for (const key of Object.keys(nodes)) {
                const value = nodeValues[key];
                this.knownRelations.set(nodes[key], value);
                if (value) {
                    const similarity = this.stringSimilarity(input, value);
                    if (similarity >= bestSimilarity) {
                        bestSimilarity = similarity;
                        queue.push(new RankedRelation(nodes[key], similarity));
                    }
                }
            }
        }

        this.activeQueries.delete(input);

        this.emit("end", input);
    }
}