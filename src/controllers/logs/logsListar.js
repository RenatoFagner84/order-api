const logRepository = require("../../repositories/logRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const logsListar = async (req, res) => {
    try {
        const query = req.query || {};

        const limiteInformado = query.limite;
        const paginaInformada = query.pagina;

        const limite = limiteInformado === undefined || limiteInformado === ""
            ? 100
            : Number(limiteInformado);

        const pagina = paginaInformada === undefined || paginaInformada === ""
            ? 1
            : Number(paginaInformada);

        if (
            !Number.isSafeInteger(limite) ||
            limite < 1 ||
            limite > 500 ||
            !Number.isSafeInteger(pagina) ||
            pagina < 1
        ) {
            responder(res, 400, {
                mensagem: "Parâmetros de paginação inválidos."
            });
            return;
        }

        const offset = (pagina - 1) * limite;

        if (!Number.isSafeInteger(offset)) {
            responder(res, 400, {
                mensagem: "Parâmetros de paginação inválidos."
            });
            return;
        }

        const resultado = await logRepository.listar(limite, offset);
        const total = await logRepository.contar();

        responder(res, 200, {
            mensagem: "Logs listados com sucesso.",
            pagina,
            limite,
            total: Number(total.rows[0].total),
            logs: resultado.rows
        });
    } catch (erro) {
        console.error("[ERRO AO LISTAR LOGS]", erro);

        responder(res, 500, {
            mensagem: "Não foi possível listar os logs."
        });
    }
};

module.exports = logsListar;