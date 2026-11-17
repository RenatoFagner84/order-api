require("dotenv").config();

const express = require("express");

const routes = require("./routes");
const logRepository = require("./repositories/logRepository");

const autenticar = require("./middlewares/autenticar");
const autorizar = require("./middlewares/autorizar");

const {
    apiLimiter,
    loginLimiter,
    recuperarSenhaLimiter,
    verificarPinLimiter,
    redefinirSenhaLimiter
} = require("./middlewares/rateLimiter");

const app = express();

const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

// ========================================
// INTERPRETAÇÃO DO CORPO DA REQUISIÇÃO
// ========================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ========================================
// RATE LIMITING
// ========================================

// Proteção geral: todas as rotas
app.use(apiLimiter);

// Proteção específica de autenticação
app.use("/users/login", loginLimiter);

// Proteção específica de recuperação de senha
app.use("/users/recuperar-senha", recuperarSenhaLimiter);

// Proteção específica de verificação do PIN
app.use("/users/verificar-pin", verificarPinLimiter);

// Proteção específica de redefinição de senha
app.use("/users/redefinir-senha", redefinirSenhaLimiter);

// ========================================
// SISTEMA DE LOGS
// ========================================

app.use((req, res, next) => {
    const inicio = Date.now();
    const rota = req.path;
    const metodo = req.method;

    const ignorarLog =
        rota === "/logs" || rota.startsWith("/logs/");

    const ip = req.socket.remoteAddress || null;
    const userAgent = req.headers["user-agent"] || null;

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
            userAgent,
            req.usuario?.id ?? null
        ).catch((erro) => {
            console.error("[ERRO AO REGISTRAR LOG]", erro.message);
        });
    });

    next();
});

// ========================================
// AUTENTICAÇÃO E AUTORIZAÇÃO
// ========================================

app.use((req, res, next) => {
    const rota = req.path;
    const metodo = req.method;

    const rotaPublicaUsuario =
        metodo === "POST" &&
        [
            "/users/login",
            "/users/inserir",
            "/users/recuperar-senha",
            "/users/verificar-pin",
            "/users/redefinir-senha"
        ].includes(rota);

    const consultaPublicaProduto =
        metodo === "GET" &&
        (
            rota === "/produtos/ler" ||
            /^\/produtos\/ler\/\d+$/.test(rota) ||
            rota === "/produtos/buscar"
        );

    if (rotaPublicaUsuario || consultaPublicaProduto) {
        return next();
    }

    autenticar(req, res, () => {
        autorizar(req, res, next);
    });
});

// ========================================
// ROTAS
// ========================================

app.use(routes.usersRoutes);
app.use(routes.produtosRoutes);
app.use(routes.pedidosRoutes);
app.use(routes.cartRoutes);
app.use(routes.caixaRoutes);
app.use(routes.enderecosRoutes);
app.use(routes.rolesRoutes);
app.use(routes.logsRoutes);

// ========================================
// ROTA NÃO ENCONTRADA
// ========================================

app.use((req, res) => {
    if (!res.headersSent) {
        res.status(404).json({
            mensagem: "Rota não encontrada."
        });
    }
});

// ========================================
// TRATAMENTO DE ERROS
// ========================================

app.use((erro, req, res, next) => {
    console.error("[ERRO NO SERVIDOR]", erro);

    if (res.headersSent) {
        return next(erro);
    }

    // Erro de interpretação do JSON enviado pelo cliente
    if (
        erro instanceof SyntaxError &&
        erro.status === 400 &&
        Object.prototype.hasOwnProperty.call(erro, "body")
    ) {
        return res.status(400).json({
            mensagem: "Corpo da requisição JSON inválido."
        });
    }

    res.status(500).json({
        mensagem: "Erro interno do servidor."
    });
});

// ========================================
// INICIALIZAÇÃO
// ========================================

app.listen(PORT, () => {
    console.log(
        `Servidor Express rodando em http://localhost:${PORT}`
    );
});

module.exports = app;
