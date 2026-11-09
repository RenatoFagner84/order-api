const pedidosRepository = require("../../repositories/pedidosRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const pedidosOcultar = async (req, res) => {
    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("error", (erro) => {
        console.error("[ERRO AO RECEBER DADOS DO PEDIDO]", erro);

        responder(res, 400, {
            mensagem: "Erro ao receber os dados da requisição."
        });
    });

    req.on("end", async () => {
        try {
            let dados;

            try {
                dados = JSON.parse(body);
            } catch {
                responder(res, 400, {
                    mensagem: "JSON inválido."
                });
                return;
            }

            const idTexto = String(dados?.id ?? "");
            const id = Number(idTexto);

            if (
                !/^\d+$/.test(idTexto) ||
                !Number.isSafeInteger(id) ||
                id <= 0
            ) {
                responder(res, 400, {
                    mensagem: "ID do pedido inválido."
                });
                return;
            }

            if (typeof pedidosRepository.ocultar !== "function") {
                responder(res, 501, {
                    mensagem: "A operação de ocultar pedidos não está implementada."
                });
                return;
            }

            const result = await pedidosRepository.ocultar(id);

            if (!result?.rows || result.rows.length === 0) {
                responder(res, 404, {
                    mensagem: "Pedido não encontrado."
                });
                return;
            }

            responder(res, 200, {
                mensagem: "Pedido ocultado com sucesso."
            });
        } catch (erro) {
            console.error("[ERRO AO OCULTAR PEDIDO]", erro);

            responder(res, 500, {
                mensagem: "Erro interno ao ocultar o pedido."
            });
        }
    });
};

module.exports = pedidosOcultar;