const enderecoRepository = require("../../repositories/enderecoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const enderecoLer = async (req, res) => {
    const id = Number(req.params?.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        responder(res, 400, {
            mensagem: "ID do endereço inválido."
        });
        return;
    }

    try {
        const resultado = await enderecoRepository.ler(id);

        if (resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Endereço não encontrado"
            });
            return;
        }

        responder(res, 200, resultado.rows[0]);
    } catch (erro) {
        console.error("[ERRO AO CONSULTAR ENDEREÇO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao consultar o endereço."
        });
    }
};

module.exports = enderecoLer;