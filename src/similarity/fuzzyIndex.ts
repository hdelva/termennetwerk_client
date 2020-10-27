function indexMap(term: string, maxLength: number) {
    const termFreq = {};
    for (let i = term.length - 1; i >= 0; i--) {
        const character = term[i];
        termFreq[character] = maxLength - i;
    }
    return termFreq;
}

function addKeysToDict(map, dict) {
    for (var key in map) {
        dict[key] = true;
    }
}

function termFreqMapToVector(map, dict) {
    var termFreqVector: number[] = [];
    for (var term in dict) {
        termFreqVector.push(map[term] || 0);
    }
    return termFreqVector;
}

function vecDotProduct(vecA, vecB) {
    var product = 0;
    for (var i = 0; i < vecA.length; i++) {
        product += vecA[i] * vecB[i];
    }
    return product;
}

function vecMagnitude(vec) {
    var sum = 0;
    for (var i = 0; i < vec.length; i++) {
        sum += vec[i] * vec[i];
    }
    return Math.sqrt(sum);
}

function cosineSimilarity(vecA, vecB) {
    return vecDotProduct(vecA, vecB) / (vecMagnitude(vecA) * vecMagnitude(vecB));
}

/*
 * Cosine similarity of first-occurence vectors,
 * i.e. the index of each character's first occurence in the string
 */
export default function fuzzyIndexSimilarity(expected: string, found: string) {
    const maxLength = Math.max(expected.length, found.length);
    var termFreqA = indexMap(expected, maxLength);
    var termFreqB = indexMap(found, maxLength);

    var dict = {};
    addKeysToDict(termFreqA, dict);
    addKeysToDict(termFreqB, dict);

    var termFreqVecA = termFreqMapToVector(termFreqA, dict);
    var termFreqVecB = termFreqMapToVector(termFreqB, dict);

    return cosineSimilarity(termFreqVecA, termFreqVecB);
}