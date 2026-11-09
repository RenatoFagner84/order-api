const enderecoRepository = require("../../repositories/enderecoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const enderecoDeletar = async (req, res) => {
    const id = Number(req.params?.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        responder(res, 400, {
            mensagem: "ID do endereço inválido."
        });
        return;
    }

    try {
        const enderecoExiste = await enderecoRepository.ler(id);

        if (enderecoExiste.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Endereço não encontrado"
            });
            return;
        }

        const resultado = await enderecoRepository.deletar(id);

        if (resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Endereço não encontrado"
            });
            return;
        }

        responder(res, 200, {
            mensagem: "Endereço excluído com sucesso",
            endereco: resultado.rows[0]
        });
    } catch (erro) {
        console.error("[ERRO AO EXCLUIR ENDEREÇO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao excluir o endereço."
        });
    }
};

module.exports = enderecoDeletar;