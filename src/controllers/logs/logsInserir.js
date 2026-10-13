
const logRepository = require("../../repositories/logRepository");

const inserir = async (req, res) => {
    const {
        metodo,
        rota,
        status_code,
        mensagem,
        ip,
        user_agent
    } = req.body;

    if (!metodo || !rota) {
        res.writeHead(400, {
            "Content-Type": "application/json"
        });

        return res.end(JSON.stringify({
            mensagem: "Método e rota são obrigatórios."
        }));
    }

    const resultado = await logRepository.inserir(
        metodo,
        rota,
        status_code,
        mensagem,
        ip,
        user_agent
    );

    res.writeHead(201, {
        "Content-Type": "application/json"
    });

    return res.end(JSON.stringify({
        mensagem: "Log registrado com sucesso.",
        log: resultado.rows[0]
    }));
};

module.exports = inserir;

