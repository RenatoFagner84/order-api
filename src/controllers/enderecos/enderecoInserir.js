const enderecoRepository = require("../../repositories/enderecoRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const enderecoInserir = async (req, res) => {
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
        console.error(
            "[ERRO AO RECEBER REQUISIÇÃO DE ENDEREÇO]",
            erro
        );

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
        user_id,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado
    } = dados;

    try {
        const resultado = await enderecoRepository.inserir(
            user_id,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado
        );

        responder(res, 201, resultado.rows[0]);
    } catch (erro) {
        console.error("[ERRO AO INSERIR ENDEREÇO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao inserir o endereço."
        });
    }
};

module.exports = enderecoInserir;