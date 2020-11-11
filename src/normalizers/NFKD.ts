import INormalizer from "./INormalizer";

export default class NKFD implements INormalizer {
    protected regex: RegExp;

    constructor() {
        // see https://javascript.info/regexp-unicode
        // \p{L} is all unicode letters
        // \p{N} is all numbers
        // \p{Z} is all separators (e.g., whitespace)
        this.regex = /[^\p{L}\p{N}\p{Z}]/gu;
    }

    public normalize(input: string): string {
        if (!input) {
            let a = 9;
        }
        input = input.trim(); // get rid of whitespace
        input = input.toLowerCase();
        input = input.normalize("NFKD"); // normalize diacritics
        input = input.replace(this.regex,'')
        return input;
    }
}
