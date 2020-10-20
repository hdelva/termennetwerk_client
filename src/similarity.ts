function indexMap(term: string, maxLength: number) {
    const termFreq = {};
    for (let i = term.length - 1; i >= 0; i--) {
        const character = term[i];
        termFreq[character] = maxLength - i;
    }
    return termFreq;
}

function freqMap(term: string) {
    const termFreq = {};
    let previous = '';
    for (let i = term.length - 1; i >= 0; i--) {
        const character = term[i];
        termFreq[character] = (termFreq[character] || 0) + 1;
        const bigram = previous + character; 
        termFreq[bigram] = (termFreq[bigram] || 0) + 1;
        previous = character;
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

export function indexSimilarity(strA: string, strB: string) {
    const maxLength = Math.max(strA.length, strB.length);
    var termFreqA = indexMap(strA, maxLength);
    var termFreqB = indexMap(strB, maxLength);

    var dict = {};
    addKeysToDict(termFreqA, dict);
    addKeysToDict(termFreqB, dict);

    var termFreqVecA = termFreqMapToVector(termFreqA, dict);
    var termFreqVecB = termFreqMapToVector(termFreqB, dict);

    return cosineSimilarity(termFreqVecA, termFreqVecB);
}

export function compositeSimilarity(expected: string, found: string) {
    const minLength = Math.min(expected.length, found.length);

    let common = 0;
    for (let i = 0; i < minLength; i++) {
        if (found[i] == expected[i]) {
            common += 1;
        } else {
            break;
        }
    }

    return common + indexSimilarity(expected, found);
}
