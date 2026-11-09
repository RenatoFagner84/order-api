const endereco = require("../controllers/enderecos");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const enderecosRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const caminho = url.pathname;

    const rotaListarPorUser = caminho.match(
        /^\/enderecos\/user\/([^/]+)$/
    );

    if (req.method === "GET" && rotaListarPorUser) {
        req.params = {
            userId: rotaListarPorUser[1]
        };

        await endereco.enderecoListarPorUser(req, res);
        return;
    }

    const rotaLer = caminho.match(
        /^\/enderecos\/ler\/([^/]+)$/
    );

    if (req.method === "GET" && rotaLer) {
        req.params = {
            id: rotaLer[1]
        };

        await endereco.enderecoLer(req, res);
        return;
    }

    if (
        req.method === "POST" &&
        caminho === "/enderecos/inserir"
    ) {
        await endereco.enderecoInserir(req, res);
        return;
    }

    const rotaAtualizar = caminho.match(
        /^\/enderecos\/atualizar\/([^/]+)$/
    );

    if (req.method === "PUT" && rotaAtualizar) {
        req.params = {
            id: rotaAtualizar[1]
        };

        await endereco.enderecoAtualizar(req, res);
        return;
    }

    const rotaDeletar = caminho.match(
        /^\/enderecos\/deletar\/([^/]+)$/
    );

    if (req.method === "DELETE" && rotaDeletar) {
        req.params = {
            id: rotaDeletar[1]
        };

        await endereco.enderecoDeletar(req, res);
        return;
    }

    responder(res, 404, {
        mensagem: "Rota de endereços não encontrada"
    });
};

module.exports = enderecosRoutes;