const pedidos = require("../controllers/pedidos");

const responder = (res, status, dados) => {
    if (res.writableEnded) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const pedidosRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost:3000");
    const caminho = url.pathname;
    const partes = caminho.split("/");
    const id = Number(partes[2]);

    // Finalizar carrinho e criar pedido.
    if (
        req.method === "POST" &&
        /^\/pedido\/\d+\/finalizar$/.test(caminho)
    ) {
        await pedidos.pedidosFinalizar(req, res);
        return;
    }

    // Criar pedido usando o usuário autenticado.
    if (req.method === "POST" && caminho === "/pedido") {
        await pedidos.pedidosCriar(req, res);
        return;
    }

    // Consultar histórico de status.
    if (
        req.method === "GET" &&
        partes.length === 4 &&
        partes[3] === "historico-status" &&
        Number.isInteger(id) &&
        id > 0
    ) {
        await pedidos.pedidosHistoricoStatus(req, res);
        return;
    }

    // Consultar pedido.
    if (
        req.method === "GET" &&
        partes.length === 3 &&
        Number.isInteger(id) &&
        id > 0
    ) {
        await pedidos.pedidosConsultar(req, res);
        return;
    }

    // Cancelar pedido do usuário autenticado.
    if (
        req.method === "PATCH" &&
        partes.length === 4 &&
        partes[3] === "cancelar" &&
        Number.isInteger(id) &&
        id > 0
    ) {
        await pedidos.pedidosCancelar(req, res);
        return;
    }

    // Atualizar status.
    if (
        req.method === "PATCH" &&
        partes.length === 3 &&
        Number.isInteger(id) &&
        id > 0
    ) {
        await pedidos.pedidosAtualizar(req, res);
        return;
    }

    // Fechamento ainda não está implementado com segurança.
    if (
        req.method === "PATCH" &&
        partes.length === 4 &&
        partes[3] === "fechar" &&
        Number.isInteger(id) &&
        id > 0
    ) {
        responder(res, 501, {
            mensagem: "Fechamento ainda não implementado."
        });
        return;
    }

    responder(res, 404, {
        mensagem: "Rota de pedido não encontrada."
    });
};

module.exports = pedidosRoutes;
