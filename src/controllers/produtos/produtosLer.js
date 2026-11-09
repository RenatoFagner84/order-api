const produtosRepository = require("../../repositories/produtoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const produtosLer = async (req, res) => {
    try {
        const resultado = await produtosRepository.lerTudo();

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO LISTAR PRODUTOS]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao listar produtos."
        });
    }
};

module.exports = produtosLer;