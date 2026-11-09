const roleRepository = require("../../repositories/roleRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const ehAdmin = async (userId) => {
    const resultado = await roleRepository.lerPorUser(userId);
    const roles = Array.isArray(resultado.rows)
        ? resultado.rows
        : [];

    return roles.some(
        (item) =>
            String(item.role || "").trim().toLowerCase() === "admin"
    );
};

const roleRemover = async (req, res) => {
    try {
        const partes = new URL(
            req.url,
            "http://localhost"
        ).pathname.split("/");

        const userIdTexto = partes[3];
        const roleIdTexto = partes[4];
        const userId = Number(userIdTexto);
        const roleId = Number(roleIdTexto);
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

        if (
            !/^\d+$/.test(roleIdTexto || "") ||
            !Number.isSafeInteger(roleId) ||
            roleId <= 0
        ) {
            responder(res, 400, {
                mensagem: "ID de papel inválido."
            });
            return;
        }

        if (!(await ehAdmin(atorId))) {
            responder(res, 403, {
                mensagem: "Somente um administrador pode remover papéis."
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

        if (
            String(role.role || "").trim().toLowerCase() === "admin"
        ) {
            const verificacao =
                await roleRepository.verificarUltimoAdminAtivo(
                    userId,
                    roleId
                );

            if (
                verificacao.usuario_e_admin_ativo === true &&
                Number(verificacao.total_admins_ativos) <= 1
            ) {
                responder(res, 409, {
                    mensagem: "Não é possível remover o papel admin do último administrador ativo."
                });
                return;
            }
        }

        const resultado = await roleRepository.remover(
            userId,
            roleId
        );

        if (!resultado.rows || resultado.rows.length === 0) {
            responder(res, 404, {
                mensagem: "Este papel não está atribuído a este usuário."
            });
            return;
        }

        responder(res, 200, {
            mensagem: "Papel removido com sucesso.",
            usuario_id: userId,
            role_id: roleId,
            role: role.role
        });
    } catch (erro) {
        console.error("[ERRO AO REMOVER PAPEL]", erro);

        responder(res, 500, {
            mensagem: "Não foi possível remover o papel."
        });
    }
};

module.exports = roleRemover;