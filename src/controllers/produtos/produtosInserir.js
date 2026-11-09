const produtoRepository = require("../../repositories/produtoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const produtosInserir = async (req, res) => {
    let body = "";

    try {
        for await (const chunk of req) {
            body += chunk.toString();

            if (body.length > 1024 * 1024) {
                responder(res, 413, {
                    mensagem: "Corpo da requisição muito grande."
                });
                return;
            }
        }
    } catch (erro) {
        console.error("[ERRO AO RECEBER PRODUTO]", erro);

        responder(res, 400, {
            mensagem: "Erro ao receber os dados da requisição."
        });
        return;
    }

    let dados;

    try {
        dados = JSON.parse(body);
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

    const { nome, quantidade, valor } = dados;

    if (
        typeof nome !== "string" ||
        !nome.trim() ||
        quantidade === undefined ||
        quantidade === null ||
        !Number.isFinite(Number(quantidade)) ||
        Number(quantidade) < 0 ||
        valor === undefined ||
        valor === null ||
        !Number.isFinite(Number(valor)) ||
        Number(valor) < 0
    ) {
        responder(res, 400, {
            mensagem: "Informe nome, quantidade e valor válidos."
        });
        return;
    }

    try {
        const nomeNormalizado = nome.trim();
        const produtoExiste = await produtoRepository.inserir(nomeNormalizado);

        if (produtoExiste.rows.length > 0) {
            responder(res, 409, {
                mensagem: "Produto já existe"
            });
            return;
        }

        const resultado = await produtoRepository.inserirProduto(
            nomeNormalizado,
            Number(quantidade),
            Number(valor)
        );

        responder(res, 201, resultado.rows[0]);
    } catch (erro) {
        console.error("[ERRO AO CADASTRAR PRODUTO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao cadastrar produto."
        });
    }
};

module.exports = produtosInserir;