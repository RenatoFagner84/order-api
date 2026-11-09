
const cartRepository = require("../../repositories/cartRepository");

const cartListarTodos = async (req, res) => {
    try {
        const userId = Number(req.usuario?.id);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            res.writeHead(401, {
                "Content-Type": "application/json; charset=utf-8"
            });
            res.end(JSON.stringify({
                mensagem: "Usuário não autenticado."
            }));
            return;
        }

        const resultado = await cartRepository.listarTodos(userId);

        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8"
        });
        res.end(JSON.stringify(resultado.rows));
    } catch (erro) {
        console.error("Erro ao listar carrinhos:", erro);

        if (!res.writableEnded) {
            res.writeHead(500, {
                "Content-Type": "application/json; charset=utf-8"
            });
            res.end(JSON.stringify({
                mensagem: "Erro interno ao listar carrinhos."
            }));
        }
    }
};

module.exports = cartListarTodos;
