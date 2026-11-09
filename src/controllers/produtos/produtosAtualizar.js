
const produtoRepository = require("../../repositories/produtoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) {
        return;
    }

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const produtosAtualizar = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const id = url.pathname.split("/")[3];

    // Validar o ID do produto
    if (!id || !/^\d+$/.test(id)) {
        responder(res, 400, {
            mensagem: "Informe um ID de produto válido."
        });
        return;
    }

    // Receber o corpo da requisição
    let body = "";

    try {
        for await (const chunk of req) {
            body += chunk.toString();

            // Limitar o corpo da requisição a 1 MB
            if (body.length > 1024 * 1024) {
                responder(res, 413, {
                    mensagem: "Corpo da requisição muito grande."
                });
                return;
            }
        }
    } catch (erro) {
        console.error(
            "[ERRO AO RECEBER ATUALIZAÇÃO DE PRODUTO]",
            erro
        );

        responder(res, 400, {
            mensagem: "Erro ao receber os dados da requisição."
        });
        return;
    }

    // Validar o JSON recebido
    let dados;

    try {
        dados = JSON.parse(body);
    } catch {
        responder(res, 400, {
            mensagem: "Corpo da requisição JSON inválido."
        });
        return;
    }

    // Garantir que o corpo seja um objeto JSON
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

    const { nome, quantidade, valor } = dados;

    // Validar os campos do produto
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
        // Verificar se o produto existe
        const produtoExiste = await produtoRepository.ler(id);

        if (
            !produtoExiste ||
            !Array.isArray(produtoExiste.rows) ||
            produtoExiste.rows.length === 0
        ) {
            responder(res, 404, {
                mensagem: "Produto não encontrado"
            });
            return;
        }

        // Atualizar o produto
        const resultado = await produtoRepository.atualizar(
            id,
            nome.trim(),
            Number(quantidade),
            Number(valor)
        );

        if (
            !resultado ||
            !Array.isArray(resultado.rows) ||
            resultado.rows.length === 0
        ) {
            responder(res, 404, {
                mensagem: "Produto não encontrado"
            });
            return;
        }

        responder(res, 200, resultado.rows[0]);
    } catch (erro) {
        console.error("[ERRO AO ATUALIZAR PRODUTO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao atualizar produto."
        });
    }
};

module.exports = produtosAtualizar;
