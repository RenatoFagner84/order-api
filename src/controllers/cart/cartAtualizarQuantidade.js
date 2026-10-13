const cartRepository = require("../../repositories/cartRepository");

const cartAtualizarQuantidade = async (req, res) => {
    const responder = (status, dados) => {
        res.writeHead(status, {
            "Content-Type": "application/json; charset=utf-8"
        });

        res.end(JSON.stringify(dados));
    };

    try {
        let body = "";

        req.on("data", (chunk) => {
            body += chunk.toString();
        });

        await new Promise((resolve, reject) => {
            req.on("end", resolve);
            req.on("error", reject);
        });

        let dados;

        try {
            dados = JSON.parse(body);
        } catch {
            responder(400, {
                mensagem: "Corpo da requisição JSON inválido."
            });
            return;
        }

        const partes = new URL(
            req.url,
            "http://localhost"
        ).pathname.split("/");

        const carrinho_id = Number(partes[2]);
        const produto_id = Number(partes[4]);
        const quantidade = Number(dados.quantidade);
        const user_id = Number(req.usuario?.id);

        if (
            !Number.isInteger(user_id) ||
            user_id <= 0
        ) {
            responder(401, {
                mensagem: "Usuário não autenticado."
            });
            return;
        }

        if (
            !Number.isInteger(carrinho_id) ||
            carrinho_id <= 0 ||
            !Number.isInteger(produto_id) ||
            produto_id <= 0
        ) {
            responder(400, {
                mensagem: "ID do carrinho ou produto inválido."
            });
            return;
        }

        if (
            !Number.isInteger(quantidade) ||
            quantidade <= 0
        ) {
            responder(400, {
                mensagem:
                    "A quantidade deve ser um número inteiro maior que zero"
            });
            return;
        }

        const carrinho = await cartRepository.consultar(
            carrinho_id
        );

        if (carrinho.rows.length === 0) {
            responder(404, {
                mensagem: "Carrinho não encontrado."
            });
            return;
        }

        const dadosCarrinho = carrinho.rows[0];

        // Impede que um usuário altere o carrinho de outra pessoa.
        if (Number(dadosCarrinho.user_id) !== user_id) {
            responder(403, {
                mensagem:
                    "Você não tem permissão para alterar este carrinho."
            });
            return;
        }

        // O cliente só pode modificar um carrinho aberto e visível.
        if (
            dadosCarrinho.status !== "aberto" ||
            dadosCarrinho.oculto === true
        ) {
            responder(409, {
                mensagem:
                    "Este carrinho não está disponível para alterações."
            });
            return;
        }

        const item = await cartRepository.consultarItem(
            carrinho_id,
            produto_id
        );

        if (item.rows.length === 0) {
            responder(404, {
                mensagem: "Produto não encontrado no carrinho."
            });
            return;
        }

        const estoque = await cartRepository.verificarEstoque(
            produto_id,
            quantidade
        );

        if (estoque.rows.length === 0) {
            responder(400, {
                mensagem:
                    "Quantidade solicitada não disponível em estoque."
            });
            return;
        }

        const resultado =
            await cartRepository.atualizarQuantidade(
                carrinho_id,
                produto_id,
                quantidade
            );

        if (resultado.rows.length === 0) {
            responder(404, {
                mensagem: "Produto não encontrado no carrinho."
            });
            return;
        }

        responder(200, {
            mensagem: "Quantidade atualizada com sucesso",
            produto: resultado.rows[0]
        });
    } catch (erro) {
        console.error(
            "Erro ao atualizar quantidade do carrinho:",
            erro
        );

        if (!res.writableEnded) {
            responder(500, {
                mensagem:
                    "Erro interno ao atualizar a quantidade do produto."
            });
        }
    }
};

module.exports = cartAtualizarQuantidade;