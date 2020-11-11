import { EventEmitter } from "events";
import { Quad } from "rdf-js";

/*
 * All implementation can emit 3 kinds of events;
 * ("reset", metadata): the Emitter reset its internal state, and listeners might want to do the same
 * ("data", quad, metadata): this quad was found, with an optional ResultMetadata object
 * ("end", metadata): this query has terminated
 */
export default abstract class ResultEmitter extends EventEmitter {
    abstract query(input: string): Promise<void>; 
    abstract resolveSubject(uri: string): Quad[];
}