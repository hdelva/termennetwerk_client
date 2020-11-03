import LDFetch from "ldfetch";
import { Quad } from "rdf-js";
import TinyQueue from "tinyqueue";

import ResultEmitter from "./ResultEmitter";
import SimilarityConfiguration from "./similarity/SimilarityConfiguration";

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

/*
 * Traverses a single data source for the requested query string
 */
export default class QueryAgent extends ResultEmitter {
    protected source: string; // access URI of the data source
    protected fetcher: LDFetch; // object that fetches and parses the RDF for us
    protected activeQueries: Set<string>; // link traversal is async, we may want to terminate query early
    protected similarityConfigurations: SimilarityConfiguration[]; // functions used to prioritize discovered relations
    protected knownRelations: Map<string, string>; // URI -> tree value

    constructor(source: string, similarityConfigurations: SimilarityConfiguration[]) {
        super();
        this.source = source;
        this.fetcher = new LDFetch();
        this.activeQueries = new Set();
        this.knownRelations = new Map();
        this.similarityConfigurations = similarityConfigurations;

        // todo, maybe make this optional
        this.prefetch();
    }

    // fetch the root node, and memorize all discovered relations
    // useful if the root node is particularly large
    public async prefetch() {
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

        // kickstart the link traversal
        // start from the already discovered nodes
        for (const [uri, value] of this.knownRelations.entries()) {
            // iteratively build the similarity vector
            // stop as soon as this relations is certainly useless
            const similarityScores: number[] = [];
            for (const conf of this.similarityConfigurations) {
                const similarity = conf.evaluate(input, value);
                if (!isNaN(similarity)) {
                    // NaN similarities are not worth following
                    similarityScores.push(similarity);
                } else {
                    break;
                }
            }

            if (similarityScores.length === this.similarityConfigurations.length) {
                // the entire vector was evaluated, so it's worth following
                queue.push(new RankedRelation(uri, similarityScores));
            }
        }

        const visited = new Set();

        while (queue.length > 0) {
            if (!this.activeQueries.has(input)) {
                // we're no longer waiting for this query's results
                break;
            }

            const blob = queue.pop();
            if (!blob) {
                continue;
            }

            const { uri: page } = blob;
            if (visited.has(page)) {
                // avoid hitting the same page multiple times
                continue;
            }

            visited.add(page);
            const data = await this.fetcher.get(page);

            const nodes = {}; // URI -> URI
            const nodeValues = {}; // URI -> list of tree values

            for (const untyped_quad of data.triples) {
                const quad: Quad = untyped_quad;

                if (quad.predicate.value == "https://w3id.org/tree#node") {
                    nodes[quad.subject.value] = quad.object.value;
                } else if (quad.predicate.value == "https://w3id.org/tree#value") {
                    // a relation may contain several tree values
                    if (!nodeValues[quad.subject.value]) {
                        nodeValues[quad.subject.value] = [];
                    }
                    nodeValues[quad.subject.value].push(quad.object.value);
                } else {
                    this.emit("data", quad);
                }
            }

            // this page has been processed; schedule the next useful pages
            for (const [key, node] of Object.entries(nodes)) {
                if (!visited.has(node)) {
                    const value = nodeValues[key];
                    this.knownRelations.set(node as string, value); // memorize this relation
                    if (value) {
                        // iteratively build the similarity vector
                        // stop as soon as this relations is certainly useless
                        const similarityScores: number[] = [];
                        for (const conf of this.similarityConfigurations) {
                            const similarity = conf.evaluate(input, value);
                            if (!isNaN(similarity)) {
                                // NaN similarities are not worth following
                                similarityScores.push(similarity);
                            } else {
                                break;
                            }
                        }

                        if (similarityScores.length === this.similarityConfigurations.length) {
                            // the entire vector was evaluated, so it's worth following
                            queue.push(new RankedRelation(node, similarityScores));
                        }
                    }
                }
            }
        }

        // signal that we're done following links
        this.activeQueries.delete(input);
        this.emit("end", input);
    }

    public resolveSubject(uri: string): Quad[] {
        return [];
    }
}