import LDFetch from "ldfetch";
import { Quad } from "rdf-js";
import TinyQueue from "tinyqueue";

import IQueryEmitter from "./IQueryEmitter";
import { SimilarityConfiguration } from "./similarity/SimilarityConfiguration";

class RankedRelation {
    public uri: string;
    public scores: number[];

    constructor(uri, scores) {
        this.uri = uri;
        this.scores = scores;
    }
}

function compareSimilarities(a: RankedRelation, b: RankedRelation): number {
    for (let i = 0; i < a.scores.length; i++) {
        if (a.scores[i] > b.scores[i]) {
            return -1;
        } else if (a.scores[i] < b.scores[i]) {
            return 1;
        }
    }

    if (a.uri > b.uri) {
        return 1;
    } else {
        return -1;
    }
}

export default class QueryAgent extends IQueryEmitter {
    protected source: string;
    protected fetcher: LDFetch;
    protected activeQueries: Set<string>;
    protected similarityConfigurations: SimilarityConfiguration[];
    protected knownRelations: Map<string, string>; // URI -> value

    constructor(source: string, similarityConfigurations: SimilarityConfiguration[]) {
        super();
        this.source = source;
        this.fetcher = new LDFetch();
        this.activeQueries = new Set();
        this.knownRelations = new Map();
        this.similarityConfigurations = similarityConfigurations; // || strictPrefixSimilarity;

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

    public async query(input: string) {
        // signal other components to reset their internal state
        this.emit("reset");

        for (const runningQuery of this.activeQueries) {
            if (input.startsWith(runningQuery) || runningQuery.startsWith(input)) {
                // this query has been changed
                this.activeQueries.delete(runningQuery);
            }
        }
        this.activeQueries.add(input);

        const queue: TinyQueue<RankedRelation> = new TinyQueue([], compareSimilarities);

        if (this.knownRelations.size === 0) {
            queue.push(new RankedRelation(this.source, 0));
        }

        for (const [uri, value] of this.knownRelations.entries()) {
            const similarityScores: number[] = [];
            for (const conf of this.similarityConfigurations) {
                const similarity = conf.evaluate(input, value);
                if (!isNaN(similarity)) {
                    similarityScores.push(similarity);
                } else {
                    break;
                }
            }

            if (similarityScores.length === this.similarityConfigurations.length) {
                queue.push(new RankedRelation(uri, similarityScores));
            }
        }

        const visited = new Set();

        while (queue.length > 0) {
            if (!this.activeQueries.has(input)) {
                break;
            }

            const blob = queue.pop();
            if (!blob) {
                continue;
            }

            const { uri: page } = blob;
            if (visited.has(page)) {
                continue;
            }

            visited.add(page);
            const data = await this.fetcher.get(page);

            const nodes = {};
            const nodeValues = {};

            for (const untyped_quad of data.triples) {
                const quad: Quad = untyped_quad;

                if (quad.predicate.value == "https://w3id.org/tree#node") {
                    nodes[quad.subject.value] = quad.object.value;
                } else if (quad.predicate.value == "https://w3id.org/tree#value") {
                    // be prepared for multiple values
                    if (!nodeValues[quad.subject.value]) {
                        nodeValues[quad.subject.value] = [];
                    }
                    nodeValues[quad.subject.value].push(quad.object.value);
                } else if (quad.object.termType == "Literal" && quad.subject.termType === "NamedNode") {
                    const dataType = quad.object.datatype.value;

                    if (dataType == "http://www.w3.org/2001/XMLSchema#string" || dataType == "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString") {
                        this.emit("data", quad);
                    }
                }
            }

            for (const [key, node] of Object.entries(nodes)) {
                if (!visited.has(node)) {
                    const value = nodeValues[key];
                    this.knownRelations.set(node as string, value);
                    if (value) {
                        const similarityScores: number[] = [];
                        for (const conf of this.similarityConfigurations) {
                            const similarity = conf.evaluate(input, value);
                            if (!isNaN(similarity)) {
                                similarityScores.push(similarity);
                            } else {
                                break;
                            }
                        }

                        if (similarityScores.length === this.similarityConfigurations.length) {
                            queue.push(new RankedRelation(node, similarityScores));
                        }
                    }
                }
            }
        }

        this.activeQueries.delete(input);

        this.emit("end", input);
    }
}