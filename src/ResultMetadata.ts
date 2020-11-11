export default class ResultMetadata {
    public overlap?: Array<[number, number]>;
    public similarity?: Array<number>;
    public query?: string;

    constructor(query: string, overlap?: Array<[number, number]>, similarity?: Array<number>) {
        this.query = query;
        this.overlap = overlap;
        this.similarity = similarity;
    }
}
