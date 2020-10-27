import AutoComplete from "../AutoComplete";
import * as RdfString from "rdf-string";

const client = new AutoComplete([
    "https://termen.opoi.org/nta",
    "https://termen.opoi.org/vtmk",
    "https://termen.opoi.org/cht",
    "https://termen.opoi.org/rkdartists"
], 10);

client.on("data", (data) => {
    postMessage(data.map(RdfString.quadToStringQuad));
})

onmessage = function(e) {
    client.query(e.data);
}
