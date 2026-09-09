const produto = require("../controllers/produtos");

const produtosRoutes = async (req, res) => {

    const partes = req.url.split("/");

    const acao = partes[2];

    if (acao === "ler") {
        await produto.produtosLer(req, res);
        return;
    }

    if (acao === "inserir") {
        await produto.produtosInserir(req, res);
        return;
    }

    if (acao === "atualizar") {
        req.id = partes[3];

        await produto.produtosAtualizar(req, res);
        return;
    }

    if (acao === "deletar") {
        req.id = partes[3];

        await produto.produtosDeletar(req, res);
        return;
    }
};

module.exports = produtosRoutes;