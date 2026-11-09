const pedidosRepository = require("../../repositories/pedidosRepository");
const roleRepository = require("../../repositories/roleRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const pedidosHistoricoStatus = async (req, res) => {
    const pathname = new URL(
        req.url,
        "http://localhost"
    ).pathname;

    const idTexto = pathname.split("/")[2];
    const id = Number(idTexto);
    const usuarioId = Number(req.usuario?.id);

    if (
        !/^\d+$/.test(idTexto || "") ||
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        responder(res, 400, {
            mensagem: "ID do pedido inválido."
        });
        return;
    }

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
        responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
        return;
    }

    try {
        const pedidoResult = await pedidosRepository.consultar(id);
        const pedido = pedidoResult.rows?.[0];

        if (!pedido || pedido.oculto === true) {
            responder(res, 404, {
                mensagem: "Pedido não encontrado."
            });
            return;
        }

        if (Number(pedido.user_id) !== usuarioId) {
            const rolesResult = await roleRepository.lerPorUser(usuarioId);

            const papeis = Array.isArray(rolesResult.rows)
                ? rolesResult.rows.map((role) =>
                    String(role.role || "").trim().toLowerCase()
                )
                : [];

            const permitido = papeis.some((role) =>
                ["admin", "manager", "sac"].includes(role)
            );

            if (!permitido) {
                responder(res, 403, {
                    mensagem: "Você não tem permissão para consultar o histórico deste pedido."
                });
                return;
            }
        }

        const historico = await pedidosRepository.lerHistoricoStatus(id);

        responder(res, 200, historico.rows);
    } catch (erro) {
        console.error("[ERRO AO CONSULTAR HISTÓRICO DO PEDIDO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao consultar o histórico do pedido."
        });
    }
};

module.exports = pedidosHistoricoStatus;