const cartRepository = require("../../repositories/cartRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const cartCriar = async (req, res) => {
    const userId = Number(req.usuario?.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
        return;
    }

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
        console.error(
            "[ERRO AO RECEBER REQUISIÇÃO PARA CRIAR CARRINHO]",
            erro
        );

        responder(res, 400, {
            mensagem: "Erro ao receber os dados da requisição."
        });
        return;
    }

    if (body.trim()) {
        try {
            const dados = JSON.parse(body);

            if (
                dados === null ||
                typeof dados !== "object" ||
                Array.isArray(dados)
            ) {
                responder(res, 400, {
                    mensagem: "O corpo da requisição deve ser um objeto JSON."
                });
                return;
            }
        } catch {
            responder(res, 400, {
                mensagem: "Corpo da requisição JSON inválido."
            });
            return;
        }
    }

    try {
        const resultado = await cartRepository.criar(userId);

        if (!resultado?.rows?.[0]) {
            responder(res, 500, {
                mensagem: "Não foi possível criar o carrinho."
            });
            return;
        }

        responder(res, 201, resultado.rows[0]);
    } catch (erro) {
        console.error("[ERRO AO CRIAR CARRINHO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao criar o carrinho."
        });
    }
};

module.exports = cartCriar;
