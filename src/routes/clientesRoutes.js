const cliente = require("../controllers/clientes");

const clientesRoutes = async (req, res) => {

    const partes = req.url.split("/");

    const acao = partes[2];

    if (acao === "ler") {
        await cliente.clientesLer(req, res);
        return;
    }

    if (acao === "inserir") {
        await cliente.clientesInserir(req, res);
        return;
    }

    if (acao === "atualizar") {
        req.id = partes[3];

        await cliente.clientesAtualizar(req, res);
        return;
    }

    if (acao === "deletar") {
        req.id = partes[3];

        await cliente.clientesDeletar(req, res);
        return;
    }
};

module.exports = clientesRoutes;