const userRepository = require("../../repositories/userRepository");
const roleRepository = require("../../repositories/roleRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const usersDeletar = async (req, res) => {
    try {
        const idTexto = req.params?.id;
        const id = Number(idTexto);

        if (
            !/^\d+$/.test(String(idTexto || "")) ||
            !Number.isSafeInteger(id) ||
            id <= 0
        ) {
            responder(res, 400, {
                mensagem: "ID de usuário inválido."
            });
            return;
        }

        const usuario = await userRepository.ler(id);

        if (!usuario.rows.length) {
            responder(res, 404, {
                mensagem: "Usuário não encontrado ou já desativado."
            });
            return;
        }

        const rolesResult = await roleRepository.lerPorUser(id);
        const roles = rolesResult.rows || [];

        const roleAdmin = roles.find(
            (role) =>
                String(role.role || "").trim().toLowerCase() === "admin"
        );

        if (roleAdmin) {
            const verificacao =
                await roleRepository.verificarUltimoAdminAtivo(
                    id,
                    roleAdmin.id
                );

            if (
                verificacao.usuario_e_admin_ativo &&
                Number(verificacao.total_admins_ativos) <= 1
            ) {
                responder(res, 409, {
                    mensagem:
                        "Não é possível desativar o último administrador ativo. Atribua o papel admin a outro usuário antes."
                });
                return;
            }
        }

        const resultado = await userRepository.deletar(id);

        if (!resultado.sucesso) {
            responder(res, 409, {
                mensagem: resultado.mensagem
            });
            return;
        }

        responder(res, 200, {
            mensagem: resultado.mensagem,
            user: resultado.user
        });
    } catch (erro) {
        console.error("[ERRO AO DESATIVAR USUÁRIO]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao desativar usuário."
        });
    }
};

module.exports = usersDeletar;