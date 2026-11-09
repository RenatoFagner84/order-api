const cartRepository = require("../../repositories/cartRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const cartConsultar = async (req, res) => {
    try {
        const carrinhoId = Number(req.params?.id);

        if (!Number.isSafeInteger(carrinhoId) || carrinhoId <= 0) {
            responder(res, 400, {
                mensagem: "ID do carrinho inválido."
            });
            return;
        }

        const usuarioId = Number(req.usuario?.id);

        if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
            responder(res, 401, {
                mensagem: "Usuário não autenticado."
            });
            return;
        }

        const resultado = await cartRepository.consultar(carrinhoId);
        const carrinho = resultado.rows[0];

        if (!carrinho) {
            responder(res, 404, {
                mensagem: "Carrinho não encontrado."
            });
            return;
        }

        const donoId = Number(carrinho.user_id);

        if (usuarioId !== donoId) {
            responder(res, 403, {
                mensagem:
                    "Você não tem permissão para consultar este carrinho."
            });
            return;
        }

        const itens = await cartRepository.consultarItens(carrinhoId);

        responder(res, 200, {
            ...carrinho,
            itens: itens.rows
        });
    } catch (erro) {
        console.error("[ERRO AO CONSULTAR CARRINHO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao consultar o carrinho."
        });
    }
};

module.exports = cartConsultar;