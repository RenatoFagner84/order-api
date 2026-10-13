const endereco = require("../controllers/enderecos");

const enderecosRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const partes = url.pathname.split("/");
    const acao = partes[2];

    if (req.method === "GET" && acao === "user" && partes[3]) {
        await endereco.enderecoListarPorUser(req, res);
        return;
    }

    if (req.method === "GET" && acao === "ler" && partes[3]) {
        await endereco.enderecoLer(req, res);
        return;
    }

    if (req.method === "POST" && acao === "inserir") {
        await endereco.enderecoInserir(req, res);
        return;
    }

    if (req.method === "PUT" && acao === "atualizar" && partes[3]) {
        await endereco.enderecoAtualizar(req, res);
        return;
    }

    if (req.method === "DELETE" && acao === "deletar" && partes[3]) {
        await endereco.enderecoDeletar(req, res);
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        mensagem: "Rota de endereços não encontrada"
    }));
};

module.exports = enderecosRoutes;