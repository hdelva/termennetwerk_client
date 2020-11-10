export default class ResultMetadata {
    public overlap: Array<[number, number]>;
    public similarity: Array<number>;

    constructor(overlap, similarity) {
        this.overlap = overlap;
        this.similarity = similarity;
    }
}
