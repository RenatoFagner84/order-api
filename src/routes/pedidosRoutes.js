const pedidos = require("../controllers/pedidos");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const pedidosRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost:3000");
    const caminho = url.pathname;

    try {
        const rotaProdutos = caminho.match(
            /^\/pedido\/(\d+)\/produtos$/
        );

        if (rotaProdutos) {
            if (req.method === "GET") {
                await pedidos.pedidosConsultar(req, res);
                return;
            }

            if (req.method === "POST") {
                await pedidos.pedidosCriar(req, res);
                return;
            }

             if (req.method === "PUT") {
                await pedidos.pedidosAtualizar(req, res);
                return;
            }

            if (req.method === "DELETE") {
                await pedidos.pedidosCancelar(req, res);
                return;
            }
        }

        if (
            req.method === "POST" &&
            /^\/pedido\/\d+\/finalizar$/.test(caminho)
        ) {
            await pedidos.pedidosFinalizar(req, res);
            return;
        }

        const historico = caminho.match(
            /^\/pedido\/(\d+)\/historico-status$/
        );

        if (req.method === "GET" && historico) {
            await pedidos.pedidosHistoricoStatus(req, res);
            return;
        }

        const cancelar = caminho.match(
            /^\/pedido\/(\d+)\/cancelar$/
        );

        if (req.method === "PATCH" && cancelar) {
            await pedidos.pedidosCancelar(req, res);
            return;
        }

        const fechar = caminho.match(
            /^\/pedido\/(\d+)\/fechar$/
        );

        if (req.method === "PATCH" && fechar) {
            await pedidos.pedidosOcultar(req, res);
            return;
        }

        responder(res, 404, {
            mensagem: "Rota de pedido não encontrada."
        });
    } catch (erro) {
        console.error("[ERRO NAS ROTAS DE PEDIDOS]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao processar a requisição."
        });
    }
};

module.exports = pedidosRoutes;