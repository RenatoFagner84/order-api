
const cartRepository = require("../../repositories/cartRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const cartAtualizarQuantidade = async (req, res) => {
    try {
        const usuarioIdOriginal = req.usuario?.id;
        const carrinhoIdOriginal = req.params?.id;
        const produtoIdOriginal = req.params?.produtoId;

        const userId = Number(usuarioIdOriginal);
        const carrinhoId = Number(carrinhoIdOriginal);
        const produtoId = Number(produtoIdOriginal);

        if (
            usuarioIdOriginal === undefined ||
            usuarioIdOriginal === null ||
            String(usuarioIdOriginal).trim() === "" ||
            !Number.isSafeInteger(userId) ||
            userId <= 0
        ) {
            responder(res, 401, {
                mensagem: "Usuário não autenticado."
            });
            return;
        }

        if (
            carrinhoIdOriginal === undefined ||
            carrinhoIdOriginal === null ||
            String(carrinhoIdOriginal).trim() === "" ||
            !Number.isSafeInteger(carrinhoId) ||
            carrinhoId <= 0 ||
            produtoIdOriginal === undefined ||
            produtoIdOriginal === null ||
            String(produtoIdOriginal).trim() === "" ||
            !Number.isSafeInteger(produtoId) ||
            produtoId <= 0
        ) {
            responder(res, 400, {
                mensagem: "ID do carrinho ou do produto inválido."
            });
            return;
        }

        let body = "";

        for await (const chunk of req) {
            body += chunk.toString();

            if (body.length > 1024 * 1024) {
                responder(res, 413, {
                    mensagem: "Corpo da requisição muito grande."
                });
                return;
            }
        }

        let dados;

        try {
            dados = JSON.parse(body || "{}");
        } catch {
            responder(res, 400, {
                mensagem: "Corpo da requisição JSON inválido."
            });
            return;
        }

        if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
            responder(res, 400, {
                mensagem: "O corpo da requisição deve ser um objeto JSON."
            });
            return;
        }

        const quantidadeOriginal = dados.quantidade;
        const quantidade = Number(quantidadeOriginal);

        if (
            quantidadeOriginal === undefined ||
            quantidadeOriginal === null ||
            String(quantidadeOriginal).trim() === "" ||
            !Number.isSafeInteger(quantidade) ||
            quantidade <= 0
        ) {
            responder(res, 400, {
                mensagem: "Informe uma quantidade válida."
            });
            return;
        }

        const carrinhoResult = await cartRepository.consultar(carrinhoId);
        const carrinho = carrinhoResult.rows[0];

        if (!carrinho) {
            responder(res, 404, {
                mensagem: "Carrinho não encontrado."
            });
            return;
        }

        if (Number(carrinho.user_id) !== userId) {
            responder(res, 403, {
                mensagem: "Você não tem permissão para alterar este carrinho."
            });
            return;
        }

        if (carrinho.status !== "aberto" || carrinho.oculto === true) {
            responder(res, 409, {
                mensagem: "Este carrinho não está disponível para alterações."
            });
            return;
        }

        const itemResult = await cartRepository.consultarItem(
            carrinhoId,
            produtoId
        );

        if (!itemResult.rows || itemResult.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Produto não encontrado no carrinho."
            });
            return;
        }

        const estoque = await cartRepository.verificarEstoque(
            produtoId,
            quantidade
        );

        if (!estoque.rows || estoque.rows.length === 0) {
            responder(res, 400, {
                mensagem: "Produto inexistente ou estoque insuficiente para a quantidade solicitada."
            });
            return;
        }

        const resultado = await cartRepository.atualizarQuantidade(
            carrinhoId,
            produtoId,
            quantidade
        );

        if (!resultado.rows || resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Produto não encontrado no carrinho."
            });
            return;
        }

        responder(res, 200, {
            mensagem: "Quantidade atualizada com sucesso",
            produto: resultado.rows[0]
        });
    } catch (erro) {
        console.error("[ERRO AO ATUALIZAR QUANTIDADE DO CARRINHO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao atualizar a quantidade do produto."
        });
    }
};

module.exports = cartAtualizarQuantidade;
