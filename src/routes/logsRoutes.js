const logs = require("../controllers/logs");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const logsRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const caminho = url.pathname;

    if (req.method === "GET" && caminho === "/logs") {
        req.query = Object.fromEntries(url.searchParams.entries());

        await logs.logsListar(req, res);
        return;
    }

    if (req.method === "POST" && caminho === "/logs/inserir") {
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
                "[ERRO AO RECEBER REQUISIÇÃO DE LOG]",
                erro
            );

            responder(res, 400, {
                mensagem: "Erro ao receber os dados da requisição."
            });
            return;
        }

        try {
            req.body = body.trim() ? JSON.parse(body) : {};
        } catch {
            responder(res, 400, {
                mensagem: "Corpo da requisição JSON inválido."
            });
            return;
        }

        if (
            !req.body ||
            typeof req.body !== "object" ||
            Array.isArray(req.body)
        ) {
            responder(res, 400, {
                mensagem: "O corpo da requisição deve ser um objeto JSON."
            });
            return;
        }

        await logs.logsInserir(req, res);
        return;
    }

    const rotaLer = caminho.match(/^\/logs\/ler\/([^/]+)$/);

    if (req.method === "GET" && rotaLer) {
        req.params = {
            id: rotaLer[1]
        };

        await logs.logsLer(req, res);
        return;
    }

    responder(res, 404, {
        mensagem: "Rota de logs não encontrada"
    });
};

module.exports = logsRoutes;