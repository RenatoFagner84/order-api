const pedidosRepository = require("../../repositories/pedidosRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify(dados));
};

const pedidosAtualizar = async (req, res) => {
    try {
        if (!req.usuario || !req.usuario.id) {
            responder(res, 401, {
                mensagem: "Usuário não autenticado."
            });
            return;
        }

        const partes = new URL(
            req.url,
            "http://localhost:3000"
        ).pathname.split("/");

        const id = Number(partes[2]);

        if (!Number.isInteger(id) || id <= 0) {
            responder(res, 400, {
                mensagem: "ID do pedido inválido."
            });
            return;
        }

        let body = "";

        for await (const chunk of req) {
            body += chunk.toString();
        }

        let dados;

        try {
            dados = JSON.parse(body);
        } catch {
            responder(res, 400, {
                mensagem: "JSON inválido."
            });
            return;
        }

        const statusId = Number(dados.status_id ?? dados.status);

        if (!Number.isInteger(statusId) || statusId <= 0) {
            responder(res, 400, {
                mensagem: "Informe um status válido."
            });
            return;
        }

        // Busca o pedido antes de permitir a alteração.
        const consulta = await pedidosRepository.consultar(id);
        const pedido = consulta.rows[0];

        if (!pedido) {
            responder(res, 404, {
                mensagem: "Pedido não encontrado."
            });
            return;
        }

        if (Number(pedido.user_id) !== Number(req.usuario.id)) {
            responder(res, 403, {
                mensagem: "Você não tem permissão para alterar este pedido."
            });
            return;
        }

        const resultado = await pedidosRepository.atualizar(
            id,
            statusId
        );

        responder(res, 200, {
            mensagem: "Pedido atualizado com sucesso.",
            pedido: resultado.rows[0]
        });
    } catch (erro) {
        console.error("[ERRO AO ATUALIZAR PEDIDO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao atualizar o pedido."
        });
    }
};

module.exports = pedidosAtualizar;
