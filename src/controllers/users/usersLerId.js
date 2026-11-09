const userRepository = require("../../repositories/userRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify(dados));
};

const extrairIdDaUrl = (req) => {
    const pathname = new URL(req.url || "http://localhost", "http://localhost").pathname;
    const partes = pathname.split("/").filter(Boolean);
    const idTexto = partes[partes.length - 1] || "";

    return idTexto;
};

const usersLerId = async (req, res) => {
    const idTexto = extrairIdDaUrl(req);

    if (!/^\d+$/.test(idTexto)) {
        responder(res, 400, {
            mensagem: "ID de usuário inválido."
        });
        return;
    }

    const id = Number(idTexto);

    if (!Number.isSafeInteger(id) || id <= 0) {
        responder(res, 400, {
            mensagem: "ID de usuário inválido."
        });
        return;
    }

    const resultado = await userRepository.ler(idTexto);

    if (resultado.rows.length === 0) {
        responder(res, 404, {
            mensagem: "User não encontrado"
        });
        return;
    }

    responder(res, 200, resultado.rows[0]);
};

module.exports = usersLerId;