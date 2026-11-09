const produtoRepository = require("../../repositories/produtoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const produtosLerId = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const partes = url.pathname.split("/");
    const id = partes[3];

    if (!id || !/^\d+$/.test(id)) {
        responder(res, 400, {
            mensagem: "Informe um ID de produto válido."
        });
        return;
    }

    try {
        const resultado = await produtoRepository.ler(id);

        if (resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Produto não encontrado"
            });
            return;
        }

        responder(res, 200, resultado.rows[0]);
    } catch (erro) {
        console.error("[ERRO AO BUSCAR PRODUTO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao buscar produto."
        });
    }
};

module.exports = produtosLerId;