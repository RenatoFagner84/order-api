const caixa = require("../controllers/caixa");

const caixaRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const partes = url.pathname.split("/");
    const acao = partes[2];

    if (req.method === "GET" && acao === "listar") {
        await caixa.caixaListar(req, res);
        return;
    }

    if (req.method === "GET" && acao === "ler" && partes[3]) {
        await caixa.caixaLer(req, res);
        return;
    }

    if (req.method === "GET" && acao === "user" && partes[3]) {
        await caixa.caixaListarPorUser(req, res);
        return;
    }

    if (req.method === "GET" && acao === "pedido" && partes[3]) {
        await caixa.caixaListarPorPedido(req, res);
        return;
    }

    if (req.method === "POST" && acao === "inserir") {
        await caixa.caixaInserir(req, res);
        return;
    }

    if (req.method === "PUT" && acao === "atualizar" && partes[3]) {
        await caixa.caixaAtualizar(req, res);
        return;
    }

    if (req.method === "DELETE" && acao === "deletar" && partes[3]) {
        await caixa.caixaDeletar(req, res);
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        mensagem: "Rota do caixa não encontrada"
    }));
};

module.exports = caixaRoutes;