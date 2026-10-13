const cartRepository = require("../../repositories/cartRepository");

const responder = (res, status, dados) => {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const cartCriar = async (req, res) => {
    if (!req.usuario || !req.usuario.id) {
        responder(res, 401, {
            mensagem: "Usuário não autenticado."
        });
        return;
    }

    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", async () => {
        try {
            if (body.trim()) {
                JSON.parse(body);
            }

            const userId = Number(req.usuario.id);

            if (!Number.isInteger(userId) || userId <= 0) {
                responder(res, 401, {
                    mensagem: "Usuário autenticado inválido."
                });
                return;
            }

            const resultado = await cartRepository.criar(userId);

            responder(res, 201, resultado.rows[0]);
        } catch (erro) {
            console.error("[ERRO AO CRIAR CARRINHO]", erro);

            if (!res.writableEnded) {
                responder(res, 500, {
                    mensagem: "Erro interno ao criar o carrinho."
                });
            }
        }
    });

    req.on("error", (erro) => {
        console.error("[ERRO AO RECEBER REQUISIÇÃO]", erro);

        if (!res.writableEnded) {
            responder(res, 400, {
                mensagem: "Erro ao receber os dados da requisição."
            });
        }
    });
};

module.exports = cartCriar;