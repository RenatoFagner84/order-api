const produtoRepository = require("../../repositories/produtoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const produtosBuscar = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const nome = (url.searchParams.get("nome") || "").trim();

    if (!nome) {
        responder(res, 400, {
            mensagem: "Informe o nome do produto"
        });
        return;
    }

    try {
        const resultado = await produtoRepository.buscarPorNome(nome);

        if (resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Produto não encontrado"
            });
            return;
        }

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO BUSCAR PRODUTOS]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao buscar produtos."
        });
    }
};

module.exports = produtosBuscar;