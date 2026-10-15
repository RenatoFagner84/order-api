
const roleRepository = require("../../repositories/roleRepository");

const roleRemover = async (req, res) => {
    const responder = (status, dados) => {
        if (res.writableEnded) {
            return;
        }

        res.writeHead(status, {
            "Content-Type": "application/json; charset=utf-8"
        });

        res.end(JSON.stringify(dados));
    };

    try {
        const url = new URL(req.url, "http://localhost");
        const partes = url.pathname.split("/");

        const userId = Number(partes[3]);
        const roleId = Number(partes[4]);

        if (!Number.isInteger(userId) || userId <= 0) {
            responder(400, {
                mensagem: "ID de usuário inválido."
            });
            return;
        }

        if (!Number.isInteger(roleId) || roleId <= 0) {
            responder(400, {
                mensagem: "ID de role inválido."
            });
            return;
        }

        if (roleId === 1) {
            const verificacao =
                await roleRepository.verificarUltimoAdminAtivo(userId);

            if (
                verificacao.usuario_e_admin_ativo &&
                verificacao.total_admins_ativos <= 1
            ) {
                responder(409, {
                    mensagem: "Não é possível remover a role admin do último administrador ativo."
                });
                return;
            }
        }

        const resultado = await roleRepository.remover(userId, roleId);

        if (resultado.rows.length === 0) {
            responder(404, {
                mensagem: "Esta role não está atribuída a este usuário."
            });
            return;
        }

        responder(200, {
            mensagem: "Role removida com sucesso.",
            usuario_id: userId,
            role_id: roleId
        });
    } catch (erro) {
        console.error("[ERRO AO REMOVER ROLE]", erro.message);

        responder(500, {
            mensagem: "Não foi possível remover a role."
        });
    }
};

module.exports = roleRemover;
