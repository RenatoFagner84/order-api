const userRepository = require("../../repositories/userRepository");
const roleRepository = require("../../repositories/roleRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const extrairIdDaUrl = (req) => {
    const pathname = new URL(req.url || "http://localhost", "http://localhost").pathname;
    const match = pathname.match(/^\/api\/users\/(\d+)\/historico-status$/);

    if (!match) return "";

    return match[1];
};

const usersHistoricoStatus = async (req, res) => {
    try {
        const idTexto = extrairIdDaUrl(req);
        const id = Number(idTexto);

        if (!/^\d+$/.test(idTexto) || !Number.isSafeInteger(id) || id <= 0) {
            responder(res, 400, {
                mensagem: "Informe um ID de usuário válido na rota."
            });
            return;
        }

        const usuarioId = Number(req.usuario?.id);

        if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
            responder(res, 401, {
                mensagem: "Usuário não autenticado."
            });
            return;
        }

        const resultadoRoles = await roleRepository.lerPorUser(usuarioId);

        const papeis = resultadoRoles.rows.map((item) =>
            String(item.role || "").trim().toLowerCase()
        );

        const permitido = papeis.some((papel) =>
            ["admin", "sac"].includes(papel)
        );

        if (!permitido) {
            responder(res, 403, {
                mensagem:
                    "Você não tem permissão para consultar o histórico de status de usuários."
            });
            return;
        }

        const userExiste = await userRepository.ler(idTexto);

        if (userExiste.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Usuário não encontrado."
            });
            return;
        }

        const resultado = await userRepository.lerHistoricoStatus(idTexto);

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error(
            "[ERRO NO HISTÓRICO DE STATUS DO USUÁRIO]",
            erro
        );

        responder(res, 500, {
            mensagem:
                "Erro interno ao consultar o histórico de status do usuário."
        });
    }
};

module.exports = usersHistoricoStatus;