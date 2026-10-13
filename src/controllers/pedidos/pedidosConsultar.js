const pedidosRepository = require("../../repositories/pedidosRepository");

const pedidosConsultar = async (req, res) => {
    try {
        const id = Number(new URL(req.url, "http://localhost").pathname.split("/")[2]);

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

        const result = await pedidosRepository.consultar(id);
        const pedido = result.rows[0];

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
                mensagem: "Você não tem permissão para consultar este pedido."
            }));
            return;
        }

        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8"
        });
        res.end(JSON.stringify(pedido));
    } catch (erro) {
        console.error("[ERRO AO CONSULTAR PEDIDO]", erro);

        if (!res.writableEnded) {
            res.writeHead(500, {
                "Content-Type": "application/json; charset=utf-8"
            });
            res.end(JSON.stringify({
                mensagem: "Erro interno ao consultar o pedido."
            }));
        }
    }
};

module.exports = pedidosConsultar;