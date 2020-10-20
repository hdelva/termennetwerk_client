import LDFetch from "ldfetch";
import { Quad } from "rdf-js";
import TinyQueue from "tinyqueue";

import IQueryEmitter from "./IQueryEmitter";
import { indexSimilarity } from "./similarity";

class RankedRelation {
    public uri: string;
    public score: number;

    constructor(uri, score) {
        this.uri = uri;
        this.score = score;
    }
}

class Relation {
    public uri: string;
    public value: string;

    constructor(uri, value) {
        this.uri = uri;
        this.value = value;
    }
}

type SimilarityFunction = (a: string, b: string) => number;

export default class QueryAgent extends IQueryEmitter {
    protected source: string;
    protected fetcher: LDFetch;
    protected activeQueries: Set<string>;
    protected stringSimilarity: SimilarityFunction;
    protected knownRelations: Set<Relation>;

    constructor(source: string, similarityFunction?: SimilarityFunction) {
        super();
        this.source = source;
        this.fetcher = new LDFetch();
        this.activeQueries = new Set();
        this.knownRelations = new Set();
        this.stringSimilarity = similarityFunction || indexSimilarity;
    }

    public async query(input: string)  {
        for (const runningQuery of this.activeQueries) {
            if (input.startsWith(runningQuery)) {
                // we're now looking for something more specific
                this.activeQueries.delete(runningQuery);
            } else if (runningQuery.startsWith(input)) {
                this.activeQueries.delete(runningQuery);
            }
        }
        this.activeQueries.add(input);

        const queue: TinyQueue<RankedRelation> = new TinyQueue([], (a: RankedRelation, b: RankedRelation) => {
            return b.score - a.score;
        });

        let bestSimilarity = 0;
        queue.push(new RankedRelation(this.source, 0));
        for (const relation of this.knownRelations) {
            const similarity = this.stringSimilarity(relation.value, input);
            if (similarity >= bestSimilarity) {
                bestSimilarity = similarity;
                queue.push(new RankedRelation(relation.uri, similarity));
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
            console.log("fetching", page);
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
                if (value) {
                    const similarity = this.stringSimilarity(value, input);
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