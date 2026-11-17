
const express = require("express");
const endereco = require("../controllers/enderecos");

const router = express.Router();

const executar = (controller) => async (req, res, next) => {
    try {
        await controller(req, res);
    } catch (erro) {
        next(erro);
    }
};

router.get(
    "/enderecos/user/:userId",
    executar(endereco.enderecoListarPorUser)
);

router.get(
    "/enderecos/ler/:id",
    executar(endereco.enderecoLer)
);

router.post(
    "/enderecos/inserir",
    executar(endereco.enderecoInserir)
);

router.put(
    "/enderecos/atualizar/:id",
    executar(endereco.enderecoAtualizar)
);

router.delete(
    "/enderecos/deletar/:id",
    executar(endereco.enderecoDeletar)
);

module.exports = router;
