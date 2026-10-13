
const logRepository = require("../../repositories/logRepository");

const listar = async (req, res) => {
    let { limite, pagina } = req.query;

    limite = parseInt(limite, 10) || 100;
    pagina = parseInt(pagina, 10) || 1;

    if (limite < 1 || limite > 500 || pagina < 1) {
        res.writeHead(400, {
            "Content-Type": "application/json"
        });

        return res.end(JSON.stringify({
            mensagem: "Parâmetros de paginação inválidos."
        }));
    }

    const offset = (pagina - 1) * limite;

    const resultado = await logRepository.listar(limite, offset);
    const total = await logRepository.contar();

    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    return res.end(JSON.stringify({
        mensagem: "Logs listados com sucesso.",
        pagina,
        limite,
        total: Number(total.rows[0].total),
        logs: resultado.rows
    }));
};

module.exports = listar;
