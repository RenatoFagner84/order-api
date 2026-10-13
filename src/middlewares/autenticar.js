const jwt = require("jsonwebtoken");

const autenticar = (req, res, proximo) => {
    const responder = (status, dados) => {
        res.writeHead(status, {
            "Content-Type": "application/json; charset=utf-8"
        });
        res.end(JSON.stringify(dados));
    };

    const autorizacao = req.headers.authorization;

    if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
        responder(401, {
            mensagem: "Token de autenticação não informado."
        });
        return;
    }

    const token = autorizacao.slice(7);
    const segredo = process.env.JWT_SECRET;

    if (!segredo) {
        console.error("JWT_SECRET não está configurado.");
        responder(500, {
            mensagem: "Erro de configuração da autenticação."
        });
        return;
    }

    try {
        const payload = jwt.verify(token, segredo);
        const userId = Number(payload.sub);

        if (!Number.isInteger(userId) || userId <= 0) {
            responder(401, {
                mensagem: "Token inválido."
            });
            return;
        }

        req.usuario = { id: userId };
        proximo();
    } catch (erro) {
        responder(401, {
            mensagem: "Token inválido ou expirado."
        });
    }
};

module.exports = autenticar;
