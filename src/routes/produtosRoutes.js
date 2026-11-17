
const express = require("express");
const produto = require("../controllers/produtos");

const router = express.Router();

const executar = (controller) => async (req, res, next) => {
    try {
        await controller(req, res);
    } catch (erro) {
        next(erro);
    }
};

router.get("/produtos/ler", executar(produto.produtosLer));

router.get("/produtos/ler/:id", executar(produto.produtosLerId));

router.get("/produtos/buscar", executar(produto.produtosBuscar));

router.post("/produtos/inserir", executar(produto.produtosInserir));

router.put("/produtos/atualizar/:id", executar(produto.produtosAtualizar));

router.delete("/produtos/deletar/:id", executar(produto.produtosDeletar));

module.exports = router;
