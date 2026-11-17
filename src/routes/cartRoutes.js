
const express = require("express");
const cart = require("../controllers/cart");

const router = express.Router();

router.post("/cart", async (req, res, next) => {
    try {
        await cart.cartCriar(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.get("/cart", async (req, res, next) => {
    try {
        await cart.cartListarTodos(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.get("/cart/:id", async (req, res, next) => {
    try {
        await cart.cartConsultar(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.post("/cart/:id/produtos", async (req, res, next) => {
    try {
        await cart.cartAdicionarProduto(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.put("/cart/:id/produtos/:produtoId", async (req, res, next) => {
    try {
        await cart.cartAtualizarQuantidade(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.delete("/cart/:id/produtos/:produtoId", async (req, res, next) => {
    try {
        await cart.cartRemoverProduto(req, res);
    } catch (erro) {
        next(erro);
    }
});

module.exports = router;
