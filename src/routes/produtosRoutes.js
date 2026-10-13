const produto = require("../controllers/produtos");

const produtosRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const partes = url.pathname.split("/");
    const acao = partes[2];

    if (req.method === "GET" && acao === "ler" && partes[3]) {
        await produto.produtosLerId(req, res);
        return;
    }

    if (req.method === "GET" && acao === "ler") {
        await produto.produtosLer(req, res);
        return;
    }

    if (req.method === "GET" && acao === "buscar") {
        await produto.produtosBuscar(req, res);
        return;
    }

    if (req.method === "POST" && acao === "inserir") {
        await produto.produtosInserir(req, res);
        return;
    }

    if (req.method === "PUT" && acao === "atualizar") {
        req.id = partes[3];
        await produto.produtosAtualizar(req, res);
        return;
    }

    if (req.method === "DELETE" && acao === "deletar") {
        req.id = partes[3];
        await produto.produtosDeletar(req, res);
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        mensagem: "Rota de produtos não encontrada"
    }));
};

module.exports = produtosRoutes;