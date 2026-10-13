
const logRepository = require("../../repositories/logRepository");

const ler = async (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id < 1) {
        res.writeHead(400, {
            "Content-Type": "application/json"
        });

        return res.end(JSON.stringify({
            mensagem: "ID do log inválido."
        }));
    }

    const resultado = await logRepository.ler(id);

    if (resultado.rows.length === 0) {
        res.writeHead(404, {
            "Content-Type": "application/json"
        });

        return res.end(JSON.stringify({
            mensagem: "Log não encontrado."
        }));
    }

    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    return res.end(JSON.stringify({
        mensagem: "Log encontrado com sucesso.",
        log: resultado.rows[0]
    }));
};

module.exports = ler;
