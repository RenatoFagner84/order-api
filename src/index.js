require("dotenv").config();

const http = require("http");
const routes = require("./routes");
const logRepository = require("./repositories/logRepository");
const autenticar = require("./middlewares/autenticar");
const autorizar = require("./middlewares/autorizar");

const server = http.createServer(async (req, res) => {
    const inicio = Date.now();
    const url = new URL(req.url, "http://localhost");
    const rota = url.pathname;

    const ignorarLog =
        rota === "/logs" ||
        rota.startsWith("/logs/");

    const metodo = req.method;
    const ip = req.socket.remoteAddress || null;
    const user_agent = req.headers["user-agent"] || null;

    res.on("finish", () => {
        if (ignorarLog) {
            return;
        }

        const status_code = res.statusCode;
        const duracao = Date.now() - inicio;

        const mensagem =
            `Requisição ${metodo} ${rota} finalizada ` +
            `com status ${status_code} em ${duracao}ms`;

        logRepository.inserir(
            metodo,
            rota,
            status_code,
            mensagem,
            ip,
            user_agent
        ).catch((erro) => {
            console.error(
                "[ERRO AO REGISTRAR LOG]",
                erro.message
            );
        });
    });

    try {
        // Rotas públicas: login e cadastro
        if (
            rota === "/users/login" ||
            rota === "/users/inserir"
        ) {
            await routes.usersRoutes(req, res);
            return;
        }

        // Demais rotas exigem autenticação e autorização
        autenticar(req, res, () => {
            autorizar(req, res, async () => {
                try {
                    if (rota.startsWith("/produtos-pedido")) {
                        await routes.produtosPedidoRoutes(req, res);
                        return;
                    }

                    if (rota.startsWith("/produtos")) {
                        await routes.produtosRoutes(req, res);
                        return;
                    }

                    if (rota.startsWith("/cart")) {
                        await routes.cartRoutes(req, res);
                        return;
                    }

                    if (rota.startsWith("/pedido")) {
                        await routes.pedidosRoutes(req, res);
                        return;
                    }

                    if (rota.startsWith("/enderecos")) {
                        await routes.enderecosRoutes(req, res);
                        return;
                    }

                    if (rota.startsWith("/caixa")) {
                        await routes.caixaRoutes(req, res);
                        return;
                    }

                    if (rota.startsWith("/roles")) {
                        await routes.rolesRoutes(req, res);
                        return;
                    }

                    if (rota.startsWith("/logs")) {
                        await routes.logsRoutes(req, res);
                        return;
                    }

                    if (rota.startsWith("/users")) {
                        await routes.usersRoutes(req, res);
                        return;
                    }

                    res.writeHead(404, {
                        "Content-Type":
                            "application/json; charset=utf-8"
                    });

                    res.end(JSON.stringify({
                        mensagem: "Rota não encontrada"
                    }));
                } catch (erro) {
                    console.error("[ERRO NA ROTA]", erro);

                    if (!res.writableEnded) {
                        res.writeHead(500, {
                            "Content-Type":
                                "application/json; charset=utf-8"
                        });

                        res.end(JSON.stringify({
                            mensagem: "Erro interno do servidor."
                        }));
                    }
                }
            });
        });
    } catch (erro) {
        console.error("[ERRO NO SERVIDOR]", erro);

        if (!res.writableEnded) {
            res.writeHead(500, {
                "Content-Type":
                    "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({
                mensagem: "Erro interno do servidor."
            }));
        }
    }
});

server.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
