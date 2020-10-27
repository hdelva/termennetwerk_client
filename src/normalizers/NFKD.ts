import INormalizer from "./INormalizer";

export default class NKFD implements INormalizer {
    protected regex: RegExp;

    constructor() {
        this.regex = /[^\p{L}\p{N}\s]/gu;
    }

    public normalize(input: string): string {
        input = input.toLowerCase();
        input = input.normalize("NFKD")
        input = input.replace(this.regex,'')
        return input;
    }
}
