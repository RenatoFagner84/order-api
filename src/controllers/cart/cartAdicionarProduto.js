
const cartRepository = require("../../repositories/cartRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const cartAdicionarProduto = async (req, res) => {
    try {
        const idUsuario = req.usuario?.id;

        if (
            idUsuario === undefined ||
            idUsuario === null ||
            String(idUsuario).trim() === "" ||
            !Number.isSafeInteger(Number(idUsuario)) ||
            Number(idUsuario) <= 0
        ) {
            responder(res, 401, {
                mensagem: "Usuário não autenticado."
            });
            return;
        }

        const userId = Number(idUsuario);
        const idCarrinho = req.params?.id;

        if (
            idCarrinho === undefined ||
            idCarrinho === null ||
            String(idCarrinho).trim() === "" ||
            !Number.isSafeInteger(Number(idCarrinho)) ||
            Number(idCarrinho) <= 0
        ) {
            responder(res, 400, {
                mensagem: "ID do carrinho inválido."
            });
            return;
        }

        const carrinhoId = Number(idCarrinho);
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

        if (
            !dados ||
            typeof dados !== "object" ||
            Array.isArray(dados)
        ) {
            responder(res, 400, {
                mensagem: "O corpo da requisição deve ser um objeto JSON."
            });
            return;
        }

        const produtoId = Number(dados.produto_id);
        const quantidade = Number(dados.quantidade);

        if (
            dados.produto_id === undefined ||
            dados.produto_id === null ||
            String(dados.produto_id).trim() === "" ||
            !Number.isSafeInteger(produtoId) ||
            produtoId <= 0 ||
            dados.quantidade === undefined ||
            dados.quantidade === null ||
            String(dados.quantidade).trim() === "" ||
            !Number.isSafeInteger(quantidade) ||
            quantidade <= 0
        ) {
            responder(res, 400, {
                mensagem: "Informe produto_id e quantidade válidos."
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

        if (
            carrinho.oculto === true ||
            String(carrinho.status || "").toLowerCase() !== "aberto"
        ) {
            responder(res, 409, {
                mensagem: "Este carrinho não está disponível para alterações."
            });
            return;
        }

        const itemAtual = await cartRepository.consultarItem(
            carrinhoId,
            produtoId
        );

        const quantidadeFinal =
            quantidade + (Number(itemAtual.rows[0]?.quantidade) || 0);

        const estoque = await cartRepository.verificarEstoque(
            produtoId,
            quantidadeFinal
        );

        if (!estoque.rows || estoque.rows.length === 0) {
            responder(res, 409, {
                mensagem: "Produto inexistente ou estoque insuficiente para a quantidade solicitada."
            });
            return;
        }

        const resultado = await cartRepository.adicionarProduto(
            carrinhoId,
            produtoId,
            quantidade
        );

        responder(res, 201, resultado.rows[0]);
    } catch (erro) {
        console.error("[ERRO AO ADICIONAR PRODUTO AO CARRINHO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao adicionar produto ao carrinho."
        });
    }
};

module.exports = cartAdicionarProduto;
