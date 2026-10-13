const pedidosRepository = require("../../repositories/pedidosRepository");

const pedidosHistoricoStatus = async (req, res) => {
    try {
        const url = new URL(req.url, "http://localhost:3000");
        const partes = url.pathname.split("/");
        const id = Number(partes[2]);

        if (!Number.isInteger(id) || id <= 0) {
            res.writeHead(400, {
                "Content-Type": "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({
                mensagem: "ID do pedido inválido."
            }));

            return;
        }

        if (!req.usuario || !req.usuario.id) {
            res.writeHead(401, {
                "Content-Type": "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({
                mensagem: "Usuário não autenticado."
            }));

            return;
        }

        const pedidoExiste = await pedidosRepository.consultar(id);
        const pedido = pedidoExiste.rows[0];

        if (!pedido) {
            res.writeHead(404, {
                "Content-Type": "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({
                mensagem: "Pedido não encontrado."
            }));

            return;
        }

        if (Number(pedido.user_id) !== Number(req.usuario.id)) {
            res.writeHead(403, {
                "Content-Type": "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({
                mensagem: "Você não tem permissão para consultar o histórico deste pedido."
            }));

            return;
        }

        const resultado = await pedidosRepository.lerHistoricoStatus(id);

        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8"
        });

        res.end(JSON.stringify(resultado.rows));
    } catch (erro) {
        console.error("[ERRO AO CONSULTAR HISTÓRICO DO PEDIDO]", erro);

        if (!res.writableEnded) {
            res.writeHead(500, {
                "Content-Type": "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({
                mensagem: "Erro interno ao consultar o histórico do pedido."
            }));
        }
    }
};

module.exports = pedidosHistoricoStatus;