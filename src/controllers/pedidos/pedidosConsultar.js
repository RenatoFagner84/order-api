const pedidosRepository = require("../../repositories/pedidosRepository.js");
const roleRepository = require("../../repositories/roleRepository.js");
const userRepository = require("../../repositories/userRepository.js");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const pedidosConsultar = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;
    const usuarioId = Number(req.usuario?.id);

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
        responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
        return;
    }

    try {
        const usuarioResult = await userRepository.ler(usuarioId);

        if (!usuarioResult.rows || usuarioResult.rows.length === 0) {
            responder(res, 401, {
                mensagem: "Usuário não autenticado ou conta inativa."
            });
            return;
        }

        if (pathname === "/pedido/produtos") {
            const resultadoRoles = await roleRepository.lerPorUser(usuarioId);

            const roles = resultadoRoles.rows.map((item) =>
                String(item.role || "").trim().toLowerCase()
            );

            if (!roles.some((role) => ["admin", "manager"].includes(role))) {
                responder(res, 403, {
                    mensagem: "Você não tem permissão para consultar todos os produtos dos pedidos."
                });
                return;
            }

            const resultado = await pedidosRepository.consultarTodosProdutos();

            responder(res, 200, resultado.rows);
            return;
        }

        const rotaProdutos = pathname.match(/^\/pedido\/(\d+)\/produtos$/);
        const rotaPedido = pathname.match(/^\/pedido\/(\d+)$/);

        const pedidoIdTexto = rotaProdutos
            ? rotaProdutos[1]
            : rotaPedido?.[1];

        const pedidoId = Number(pedidoIdTexto);

        if (
            !/^\d+$/.test(pedidoIdTexto || "") ||
            !Number.isSafeInteger(pedidoId) ||
            pedidoId <= 0
        ) {
            responder(res, 400, {
                mensagem: "ID do pedido inválido."
            });
            return;
        }

        const resultadoPedido = await pedidosRepository.consultar(pedidoId);
        const pedido = resultadoPedido.rows[0];

        if (!pedido) {
            responder(res, 404, {
                mensagem: "Pedido não encontrado."
            });
            return;
        }

        if (Number(pedido.user_id) !== usuarioId) {
            const resultadoRoles = await roleRepository.lerPorUser(usuarioId);

            const roles = resultadoRoles.rows.map((item) =>
                String(item.role || "").trim().toLowerCase()
            );

            if (!roles.some((role) => ["admin", "manager", "sac"].includes(role))) {
                responder(res, 403, {
                    mensagem: "Você não tem permissão para consultar este pedido."
                });
                return;
            }
        }

        const resultadoProdutos = await pedidosRepository.consultarProdutos(pedidoId);

        if (rotaProdutos) {
            responder(res, 200, resultadoProdutos.rows);
            return;
        }

        responder(res, 200, {
            ...pedido,
            produtos: resultadoProdutos.rows
        });
    } catch (erro) {
        console.error("[ERRO AO CONSULTAR PEDIDO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao consultar o pedido."
        });
    }
};

module.exports = pedidosConsultar;