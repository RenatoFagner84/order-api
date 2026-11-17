
const express = require("express");
const logs = require("../controllers/logs");

const router = express.Router();

router.get("/logs", async (req, res, next) => {
    try {
        await logs.logsListar(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.get("/logs/ler/:id", async (req, res, next) => {
    try {
        await logs.logsLer(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.post("/logs/inserir", async (req, res, next) => {
    let body = "";

    try {
        for await (const chunk of req) {
            body += chunk.toString();

            if (body.length > 1024 * 1024) {
                return res.status(413).json({
                    mensagem: "Corpo da requisição muito grande."
                });
            }
        }

        try {
            req.body = body.trim() ? JSON.parse(body) : {};
        } catch {
            return res.status(400).json({
                mensagem: "Corpo da requisição JSON inválido."
            });
        }

        if (
            !req.body ||
            typeof req.body !== "object" ||
            Array.isArray(req.body)
        ) {
            return res.status(400).json({
                mensagem: "O corpo da requisição deve ser um objeto JSON."
            });
        }

        await logs.logsInserir(req, res);
    } catch (erro) {
        next(erro);
    }
});

module.exports = router;
