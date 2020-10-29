export { default } from "./AutoComplete";


/*
export default class AutoCompleteWorker extends IQueryEmitter {
    protected worker: Worker;

    constructor() {
        super();
        this.worker = new Worker();

        const self = this;
        this.worker.onmessage = (e) => {
            const r = [];
            for (const s of e.data) {
                r.push(RdfString.stringQuadToQuad(s));
            }
            self.emit("data", r);
        }

    }
    public async query(input: string) {
        this.worker.postMessage(input);
    }
}
*/

/*
import AutoComplete from "./AutoComplete";

const x = new AutoComplete([
    "https://termen.opoi.org/nta",
    "https://termen.opoi.org/rkdartists",
    "https://termen.opoi.org/cht",
    "https://termen.opoi.org/vtmk"],
    10);

x.on("reset", () => {
    console.log("");
})

x.on("data", (d) => {
    console.log(d.object.value);
});

//x.query("ver");


//x.query("Métérié");
x.query("vincent van go");
*/
