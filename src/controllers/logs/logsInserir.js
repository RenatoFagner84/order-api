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
            "Content-Type": "application/json; charset=utf-8"
        });

        return res.end(JSON.stringify({
            mensagem: "Método e rota são obrigatórios."
        }));
    }

    try {
        // O usuário vem do middleware de autenticação.
        // Não confiamos em user_id enviado pelo cliente.
        const user_id = req.usuario?.id ?? null;

        const resultado = await logRepository.inserir(
            metodo,
            rota,
            status_code,
            mensagem,
            ip,
            user_agent,
            user_id
        );

        res.writeHead(201, {
            "Content-Type": "application/json; charset=utf-8"
        });

        return res.end(JSON.stringify({
            mensagem: "Log registrado com sucesso.",
            log: resultado.rows[0]
        }));
    } catch (erro) {
        console.error(
            "[ERRO AO INSERIR LOG MANUAL]",
            erro.message
        );

        res.writeHead(500, {
            "Content-Type": "application/json; charset=utf-8"
        });

        return res.end(JSON.stringify({
            mensagem: "Não foi possível registrar o log."
        }));
    }
};

module.exports = inserir;