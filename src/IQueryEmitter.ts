import { EventEmitter } from "events";

export default abstract class IQueryEmitter extends EventEmitter {
    abstract query(input: string): Promise<void>; 
}