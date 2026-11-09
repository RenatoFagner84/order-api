const roles = require("../controllers/roles");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
};

const rolesRoutes = async (req, res) => {
    const pathname = new URL(
        req.url,
        "http://localhost"
    ).pathname;

    if (req.method === "GET" && pathname === "/roles/ler") {
        await roles.roleLer(req, res);
        return;
    }

    if (
        req.method === "GET" &&
        /^\/roles\/user\/\d+$/.test(pathname)
    ) {
        await roles.rolesPorUser(req, res);
        return;
    }

    if (
        req.method === "POST" &&
        /^\/roles\/user\/\d+$/.test(pathname)
    ) {
        await roles.roleAtribuir(req, res);
        return;
    }

    if (
        req.method === "DELETE" &&
        /^\/roles\/user\/\d+\/\d+$/.test(pathname)
    ) {
        await roles.roleRemover(req, res);
        return;
    }

    responder(res, 404, {
        mensagem: "Rota de papéis não encontrada."
    });
};

module.exports = rolesRoutes;