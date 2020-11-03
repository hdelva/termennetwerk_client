import FuzzyAutoComplete from "./examples/FuzzyAutoComplete";
import StrictAutoComplete from "./examples/StrictAutoComplete";
import QueryAgent from "./QueryAgent";
import QueryAggregator from "./QueryAggregator";
import ResultEmitter from "./ResultEmitter";
import ResultRanking from "./ResultRanking";
import ResultStore from "./ResultStore";
import ResultUniqueFilter from "./ResultUniqueFilter";
import asymmetricDiceCoefficient from "./similarity/asymmetricDiceCoefficient";
import commonPrefixSimilarity from "./similarity/commonPrefix";
import fuzzyIndexSimilarity from "./similarity/fuzzyIndex";
import fuzzyPrefixSimilarity from "./similarity/fuzzyPrefix";
import SimilarityConfiguration from "./similarity/SimilarityConfiguration";
import strictPrefixSimilarity from "./similarity/strictPrefix";
import tokenwiseCompare from "./similarity/tokenwise";
import NFKD from "./normalizers/NFKD";

module.exports = {
    examples: {
        StrictAutoComplete,
        FuzzyAutoComplete,
    },
    components: {
        QueryAgent,
        QueryAggregator,
        ResultEmitter,
        ResultRanking,
        ResultStore,
        ResultUniqueFilter,
        SimilarityConfiguration,
        NFKD,
    },
    similarityFunctions: {
        asymmetricDiceCoefficient,
        commonPrefixSimilarity,
        fuzzyIndexSimilarity,
        fuzzyPrefixSimilarity,
        strictPrefixSimilarity,
        tokenwiseCompare,
    }
}
