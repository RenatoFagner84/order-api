const caixa = require("../controllers/caixa");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const caixaRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const partes = url.pathname.split("/");
    const acao = partes[2];
    const idTexto = partes[3] || "";
    const idValido =
        /^\d+$/.test(idTexto) &&
        Number.isSafeInteger(Number(idTexto)) &&
        Number(idTexto) > 0;

    try {
        if (req.method === "GET" && acao === "listar" && partes.length === 3) {
            await caixa.caixaListar(req, res);
            return;
        }

        if (req.method === "GET" && acao === "ler" && idValido && partes.length === 4) {
            await caixa.caixaLer(req, res);
            return;
        }

        if (req.method === "GET" && acao === "user" && idValido && partes.length === 4) {
            await caixa.caixaListarPorUser(req, res);
            return;
        }

        if (req.method === "GET" && acao === "pedido" && idValido && partes.length === 4) {
            await caixa.caixaListarPorPedido(req, res);
            return;
        }

        if (req.method === "POST" && acao === "inserir" && partes.length === 3) {
            await caixa.caixaInserir(req, res);
            return;
        }

        if (req.method === "PUT" && acao === "atualizar" && idValido && partes.length === 4) {
            await caixa.caixaAtualizar(req, res);
            return;
        }

        if (req.method === "DELETE" && acao === "deletar" && idValido && partes.length === 4) {
            await caixa.caixaDeletar(req, res);
            return;
        }

        responder(res, 404, {
            mensagem: "Rota do caixa não encontrada."
        });
    } catch (erro) {
        console.error("[ERRO NAS ROTAS DO CAIXA]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao processar a rota do caixa."
        });
    }
};

module.exports = caixaRoutes;