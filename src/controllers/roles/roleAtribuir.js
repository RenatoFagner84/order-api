const roleRepository = require("../../repositories/roleRepository");

const roleAtribuir = async (req, res) => {
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

        if (!Number.isInteger(userId) || userId <= 0) {
            responder(400, {
                mensagem: "ID de usuário inválido."
            });
            return;
        }

        const body = await new Promise((resolve, reject) => {
            let data = "";

            req.on("data", (chunk) => {
                data += chunk.toString();
            });

            req.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error("JSON_INVALIDO"));
                }
            });

            req.on("error", reject);
        });

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body)
        ) {
            responder(400, {
                mensagem: "Envie um objeto JSON válido."
            });
            return;
        }

        const roleId = body.role_id;

        if (
            !Number.isInteger(roleId) ||
            roleId <= 0
        ) {
            responder(400, {
                mensagem: "Informe um role_id inteiro e válido."
            });
            return;
        }

        const resultado = await roleRepository.atribuir(
            userId,
            roleId
        );

        if (resultado.rows.length === 0) {
            responder(409, {
                mensagem: "Esta role já está atribuída a este usuário."
            });
            return;
        }

        responder(200, {
            mensagem: "Role atribuída com sucesso.",
            usuario_id: userId,
            role_id: roleId
        });
    } catch (erro) {
        if (erro.message === "JSON_INVALIDO") {
            responder(400, {
                mensagem: "O corpo da requisição contém um JSON inválido."
            });
            return;
        }

        if (erro.code === "23503") {
            responder(404, {
                mensagem: "Usuário ou role não encontrado."
            });
            return;
        }

        console.error(
            "[ERRO AO ATRIBUIR ROLE]",
            erro.message
        );

        responder(500, {
            mensagem: "Não foi possível atribuir a role."
        });
    }
};

module.exports = roleAtribuir;