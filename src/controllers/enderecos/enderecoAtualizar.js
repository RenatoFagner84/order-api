const enderecoRepository = require("../../repositories/enderecoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const enderecoAtualizar = async (req, res) => {
    const id = Number(req.params?.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        responder(res, 400, {
            mensagem: "ID do endereço inválido."
        });
        return;
    }

    let body = "";

    try {
        for await (const chunk of req) {
            body += chunk.toString();

            if (body.length > 1024 * 1024) {
                responder(res, 413, {
                    mensagem: "Corpo da requisição muito grande."
                });
                return;
            }
        }
    } catch (erro) {
        console.error("[ERRO AO RECEBER REQUISIÇÃO DE ENDEREÇO]", erro);

        responder(res, 400, {
            mensagem: "Erro ao receber os dados da requisição."
        });
        return;
    }

    let dados;

    try {
        dados = JSON.parse(body);
    } catch {
        responder(res, 400, {
            mensagem: "Corpo da requisição JSON inválido."
        });
        return;
    }

    if (
        !dados ||
        typeof dados !== "object" ||
        Array.isArray(dados)
    ) {
        responder(res, 400, {
            mensagem: "O corpo da requisição deve ser um objeto JSON."
        });
        return;
    }

    const {
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado
    } = dados;

    try {
        const enderecoExiste = await enderecoRepository.ler(id);

        if (enderecoExiste.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Endereço não encontrado"
            });
            return;
        }

        const resultado = await enderecoRepository.atualizar(
            id,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado
        );

        responder(res, 200, resultado.rows[0]);
    } catch (erro) {
        console.error("[ERRO AO ATUALIZAR ENDEREÇO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao atualizar o endereço."
        });
    }
};

module.exports = enderecoAtualizar;