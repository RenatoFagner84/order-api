const cartRepository = require("../../repositories/cartRepository");

const responder = (res, status, dados) => {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const cartConsultar = async (req, res) => {
    try {
        const url = new URL(req.url, "http://localhost");
        const partes = url.pathname.split("/");
        const carrinhoId = Number(partes[2]);

        if (!Number.isInteger(carrinhoId) || carrinhoId <= 0) {
            responder(res, 400, {
                mensagem: "ID do carrinho inválido."
            });
            return;
        }

        if (!req.usuario || !req.usuario.id) {
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

        const usuarioId = Number(req.usuario.id);
        const donoId = Number(carrinho.user_id);

        if (usuarioId !== donoId) {
            responder(res, 403, {
                mensagem: "Você não tem permissão para consultar este carrinho."
            });
            return;
        }

        const itens = await cartRepository.consultarItens(carrinhoId);

        const resposta = {
            ...carrinho,
            itens: itens.rows
        };

        responder(res, 200, resposta);
    } catch (erro) {
        console.error("[ERRO AO CONSULTAR CARRINHO]", erro);

        if (!res.writableEnded) {
            responder(res, 500, {
                mensagem: "Erro interno ao consultar o carrinho."
            });
        }
    }
};

module.exports = cartConsultar;