const userRepository = require("../../repositories/userRepository");

const usersAtualizar = async (req, res) => {
    const id = req.url.split("/")[3];

    let body = "";

    return new Promise((resolve) => {
        req.on("data", (chunk) => {
            body += chunk.toString();
        });

        req.on("end", async () => {
            const dados = body ? JSON.parse(body) : {};

            const {
                nome,
                email,
                telefone,
                status_id
            } = dados;

            const userExiste = await userRepository.ler(id);

            if (userExiste.rows.length === 0) {
                res.writeHead(404, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    mensagem: "Usuario não encontrado"
                }));

                resolve();
                return;
            }

            const result = await userRepository.atualizar(
                id,
                nome,
                email,
                telefone,
                status_id
            );

            res.writeHead(200, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify(result.rows[0]));

            resolve();
        });
    });
};

module.exports = usersAtualizar;