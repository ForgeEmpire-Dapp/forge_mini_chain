import express from "express";
import bodyParser from "body-parser";
export function startApi(port, handlers) {
    const app = express();
    app.use(bodyParser.json());
    app.get("/health", (_req, res) => res.json({ ok: true }));
    app.get("/head", (_req, res) => res.json(handlers.getHead()));
    app.get("/state/:addr", (req, res) => res.json(handlers.getState()[req.params.addr] || null));
    app.post("/tx", (req, res) => {
        const stx = req.body;
        if (!stx?.tx?.type)
            return res.status(400).json({ error: "bad tx" });
        handlers.submitTx(stx);
        res.json({ ok: true, hash: stx.hash });
    });
    app.listen(port, () => console.log(`[api] http://localhost:${port}`));
}
