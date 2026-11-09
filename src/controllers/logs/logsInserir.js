const logRepository = require("../../repositories/logRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const logsInserir = async (req, res) => {
    const dados = req.body;

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
        metodo,
        rota,
        status_code,
        mensagem,
        ip,
        user_agent
    } = dados;

    if (
        typeof metodo !== "string" ||
        !metodo.trim() ||
        typeof rota !== "string" ||
        !rota.trim()
    ) {
        responder(res, 400, {
            mensagem: "Método e rota são obrigatórios."
        });
        return;
    }

    try {
        const userId = req.usuario?.id ?? null;

        const resultado = await logRepository.inserir(
            metodo,
            rota,
            status_code,
            mensagem,
            ip,
            user_agent,
            userId
        );

        responder(res, 201, {
            mensagem: "Log registrado com sucesso.",
            log: resultado.rows[0]
        });
    } catch (erro) {
        console.error("[ERRO AO INSERIR LOG MANUAL]", erro);

        responder(res, 500, {
            mensagem: "Não foi possível registrar o log."
        });
    }
};

module.exports = logsInserir;