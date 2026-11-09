const roleRepository = require("../../repositories/roleRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const roleLer = async (req, res) => {
    try {
        const resultado = await roleRepository.lerTudo();

        responder(res, 200, resultado.rows);
    } catch (erro) {
        console.error("[ERRO AO LISTAR PAPÉIS]", erro);

        responder(res, 500, {
            mensagem: "Erro interno ao listar papéis."
        });
    }
};

module.exports = roleLer;