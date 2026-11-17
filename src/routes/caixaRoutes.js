
const express = require("express");
const caixa = require("../controllers/caixa");

const router = express.Router();

router.get("/caixa/listar", (req, res) => {
    return caixa.caixaListar(req, res);
});

router.get("/caixa/ler/:id", (req, res) => {
    return caixa.caixaLer(req, res);
});

router.get("/caixa/user/:id", (req, res) => {
    return caixa.caixaListarPorUser(req, res);
});

router.get("/caixa/pedido/:id", (req, res) => {
    return caixa.caixaListarPorPedido(req, res);
});

router.post("/caixa/inserir", (req, res) => {
    return caixa.caixaInserir(req, res);
});

router.put("/caixa/atualizar/:id", (req, res) => {
    return caixa.caixaAtualizar(req, res);
});

router.delete("/caixa/deletar/:id", (req, res) => {
    return caixa.caixaDeletar(req, res);
});

module.exports = router;
