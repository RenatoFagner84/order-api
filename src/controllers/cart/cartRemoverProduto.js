
const cartRepository = require("../../repositories/cartRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const cartRemoverProduto = async (req, res) => {
    try {
        const userId = Number(req.usuario?.id);
        const carrinhoId = Number(req.params?.id);
        const produtoId = Number(req.params?.produtoId);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            responder(res, 401, {
                mensagem: "Usuário não autenticado."
            });
            return;
        }

        if (
            !Number.isSafeInteger(carrinhoId) ||
            carrinhoId <= 0 ||
            !Number.isSafeInteger(produtoId) ||
            produtoId <= 0
        ) {
            responder(res, 400, {
                mensagem: "ID do carrinho ou do produto inválido."
            });
            return;
        }

        const carrinhoResult = await cartRepository.consultar(carrinhoId);
        const carrinho = carrinhoResult?.rows?.[0];

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

        if (
            carrinho.oculto === true ||
            String(carrinho.status || "").toLowerCase() !== "aberto"
        ) {
            responder(res, 409, {
                mensagem: "Este carrinho não está disponível para alterações."
            });
            return;
        }

        const resultado = await cartRepository.removerProduto(
            carrinhoId,
            produtoId
        );

        if (!resultado?.rows || resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Produto do carrinho não encontrado."
            });
            return;
        }

        responder(res, 200, {
            mensagem: "Produto removido do carrinho com sucesso."
        });
    } catch (erro) {
        console.error(
            "[ERRO AO REMOVER PRODUTO DO CARRINHO]",
            erro
        );

        responder(res, 500, {
            mensagem: "Erro interno ao remover produto do carrinho."
        });
    }
};

module.exports = cartRemoverProduto;
