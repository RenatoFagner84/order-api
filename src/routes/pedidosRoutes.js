
const express = require("express");
const pedidos = require("../controllers/pedidos");

const router = express.Router();

const executar = (controller) => async (req, res, next) => {
    try {
        await controller(req, res);
    } catch (erro) {
        next(erro);
    }
};

router.get(
    "/pedido/produtos",
    executar(pedidos.pedidosConsultar)
);

router.get(
    "/pedido/:id/produtos",
    executar(pedidos.pedidosConsultar)
);

router.post(
    "/pedido/:id/produtos",
    executar(pedidos.pedidosCriar)
);

router.put(
    "/pedido/:id/produtos/:produtoId",
    executar(pedidos.pedidosAtualizar)
);

router.delete(
    "/pedido/:id/produtos",
    executar(pedidos.pedidosCancelar)
);

router.post(
    "/pedido/:id/finalizar",
    executar(pedidos.pedidosFinalizar)
);

router.get(
    "/pedido/:id/historico-status",
    executar(pedidos.pedidosHistoricoStatus)
);

router.patch(
    "/pedido/:id/cancelar",
    executar(pedidos.pedidosCancelar)
);

router.patch(
    "/pedido/:id/fechar",
    executar(pedidos.pedidosOcultar)
);

module.exports = router;
