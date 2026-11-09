
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
    const metodo = req.method;

    const ignorarLog =
        rota === "/logs" || rota.startsWith("/logs/");

    const ip = req.socket.remoteAddress || null;
    const user_agent = req.headers["user-agent"] || null;

    res.on("finish", () => {
        if (ignorarLog) return;

        const mensagem =
            `Requisição ${metodo} ${rota} finalizada ` +
            `com status ${res.statusCode} em ${Date.now() - inicio}ms`;

        logRepository.inserir(
            metodo,
            rota,
            res.statusCode,
            mensagem,
            ip,
            user_agent,
            req.usuario?.id ?? null
        ).catch((erro) => {
            console.error("[ERRO AO REGISTRAR LOG]", erro.message);
        });
    });

    try {
        const consultaPublicaProduto =
            metodo === "GET" &&
            (
                rota === "/produtos/ler" ||
                /^\/produtos\/ler\/\d+$/.test(rota) ||
                rota === "/produtos/buscar"
            );

        const rotaPublicaUsuario =
            metodo === "POST" &&
            (
                rota === "/users/login" ||
                rota === "/users/inserir" ||
                rota === "/users/recuperar-senha" ||
                rota === "/users/verificar-pin" ||
                rota === "/users/redefinir-senha"
            );

        if (rotaPublicaUsuario || consultaPublicaProduto) {
            if (consultaPublicaProduto) {
                await routes.produtosRoutes(req, res);
            } else {
                await routes.usersRoutes(req, res);
            }

            return;
        }

        autenticar(req, res, () => {
            autorizar(req, res, async () => {
                try {
                    if (rota.startsWith("/produtos")) {
                        await routes.produtosRoutes(req, res);
                    } else if (rota.startsWith("/cart")) {
                        await routes.cartRoutes(req, res);
                    } else if (rota.startsWith("/pedido")) {
                        await routes.pedidosRoutes(req, res);
                    } else if (rota.startsWith("/enderecos")) {
                        await routes.enderecosRoutes(req, res);
                    } else if (rota.startsWith("/caixa")) {
                        await routes.caixaRoutes(req, res);
                    } else if (rota.startsWith("/roles")) {
                        await routes.rolesRoutes(req, res);
                    } else if (rota.startsWith("/logs")) {
                        await routes.logsRoutes(req, res);
                    } else if (rota.startsWith("/users")) {
                        await routes.usersRoutes(req, res);
                    } else if (!res.writableEnded) {
                        res.writeHead(404, {
                            "Content-Type": "application/json; charset=utf-8"
                        });

                        res.end(JSON.stringify({
                            mensagem: "Rota não encontrada"
                        }));
                    }
                } catch (erro) {
                    console.error("[ERRO NA ROTA]", erro);

                    if (!res.writableEnded) {
                        res.writeHead(500, {
                            "Content-Type": "application/json; charset=utf-8"
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
                "Content-Type": "application/json; charset=utf-8"
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
