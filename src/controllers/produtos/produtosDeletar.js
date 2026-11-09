const produtoRepository = require("../../repositories/produtoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const produtosDeletar = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const id = url.pathname.split("/")[3];

    if (!id || !/^\d+$/.test(id)) {
        responder(res, 400, {
            mensagem: "Informe um ID de produto válido."
        });
        return;
    }

    try {
        const resultado = await produtoRepository.deletar(id);

        if (resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Produto não encontrado"
            });
            return;
        }

        responder(res, 200, {
            mensagem: "Produto deletado com sucesso",
            produto: resultado.rows[0]
        });
    } catch (erro) {
        console.error("[ERRO AO DELETAR PRODUTO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao deletar produto."
        });
    }
};

module.exports = produtosDeletar;