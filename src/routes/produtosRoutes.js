const produto = require("../controllers/produtos");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const produtosRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const partes = url.pathname.split("/");
    const acao = partes[2];
    const id = partes[3];

    if (req.method === "GET" && acao === "ler" && id) {
        await produto.produtosLerId(req, res);
        return;
    }

    if (req.method === "GET" && acao === "ler") {
        await produto.produtosLer(req, res);
        return;
    }

    if (req.method === "GET" && acao === "buscar") {
        req.query = Object.fromEntries(url.searchParams.entries());
        await produto.produtosBuscar(req, res);
        return;
    }

    if (req.method === "POST" && acao === "inserir") {
        await produto.produtosInserir(req, res);
        return;
    }

    if (req.method === "PUT" && acao === "atualizar" && id) {
        req.id = id;
        await produto.produtosAtualizar(req, res);
        return;
    }

    if (req.method === "DELETE" && acao === "deletar" && id) {
        req.id = id;
        await produto.produtosDeletar(req, res);
        return;
    }

    responder(res, 404, {
        mensagem: "Rota de produtos não encontrada"
    });
};

module.exports = produtosRoutes;