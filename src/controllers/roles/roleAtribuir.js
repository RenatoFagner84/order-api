const roleRepository = require("../../repositories/roleRepository");
const userRepository = require("../../repositories/userRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const ehAdmin = async (userId) => {
    const resultado = await roleRepository.lerPorUser(userId);
    const roles = Array.isArray(resultado.rows) ? resultado.rows : [];

    return roles.some(
        (item) => String(item.role || "").trim().toLowerCase() === "admin"
    );
};

const lerBodyJson = async (req) => {
    let body = "";

    for await (const chunk of req) {
        body += chunk.toString();

        if (body.length > 1024 * 1024) {
            const erro = new Error("BODY_MUITO_GRANDE");
            throw erro;
        }
    }

    try {
        return JSON.parse(body);
    } catch {
        throw new Error("JSON_INVALIDO");
    }
};

const roleAtribuir = async (req, res) => {
    try {
        const partes = new URL(req.url, "http://localhost").pathname.split("/");
        const userIdTexto = partes[3];
        const userId = Number(userIdTexto);
        const atorId = Number(req.usuario?.id);

        if (!Number.isSafeInteger(atorId) || atorId <= 0) {
            responder(res, 401, {
                mensagem: "Usuário não autenticado."
            });
            return;
        }

        if (
            !/^\d+$/.test(userIdTexto || "") ||
            !Number.isSafeInteger(userId) ||
            userId <= 0
        ) {
            responder(res, 400, {
                mensagem: "ID de usuário inválido."
            });
            return;
        }

        if (!(await ehAdmin(atorId))) {
            responder(res, 403, {
                mensagem: "Somente um administrador pode atribuir papéis."
            });
            return;
        }

        const usuario = await userRepository.ler(userId);

        if (!usuario.rows || usuario.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Usuário não encontrado ou inativo."
            });
            return;
        }

        const body = await lerBodyJson(req);

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            responder(res, 400, {
                mensagem: "Envie um objeto JSON válido."
            });
            return;
        }

        const roleId = body.role_id;

        if (!Number.isSafeInteger(roleId) || roleId <= 0) {
            responder(res, 400, {
                mensagem: "Informe um role_id inteiro e válido."
            });
            return;
        }

        const role = await roleRepository.buscarPorId(roleId);

        if (!role) {
            responder(res, 404, {
                mensagem: "Papel não encontrado."
            });
            return;
        }

        const resultado = await roleRepository.atribuir(userId, roleId);

        if (!resultado.rows || resultado.rows.length === 0) {
            responder(res, 409, {
                mensagem: "Este papel já está atribuído a este usuário."
            });
            return;
        }

        responder(res, 200, {
            mensagem: "Papel atribuído com sucesso.",
            usuario_id: userId,
            role_id: roleId,
            role: role.role
        });
    } catch (erro) {
        if (erro.message === "JSON_INVALIDO") {
            responder(res, 400, {
                mensagem: "O corpo da requisição contém um JSON inválido."
            });
            return;
        }

        if (erro.message === "BODY_MUITO_GRANDE") {
            responder(res, 413, {
                mensagem: "O corpo da requisição excede o tamanho permitido."
            });
            return;
        }

        if (erro.code === "23503") {
            responder(res, 404, {
                mensagem: "Usuário ou papel não encontrado."
            });
            return;
        }

        console.error("[ERRO AO ATRIBUIR PAPEL]", erro);

        responder(res, 500, {
            mensagem: "Não foi possível atribuir o papel."
        });
    }
};

module.exports = roleAtribuir;