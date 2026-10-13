const roles = require("../controllers/roles");

const rolesRoutes = (req, res) => {
    const caminho = req.url.split("/");

    if (req.method === "GET" && caminho[2] === "ler") {
        return roles.roleLer(req, res);
    }

    if (req.method === "GET" && caminho[2] === "user" && caminho[3]) {
        return roles.rolesPorUser(req, res);
    }

    if (req.method === "POST" && caminho[2] === "user" && caminho[3]) {
        return roles.roleAtribuir(req, res);
    }

    if (req.method === "DELETE" && caminho[2] === "user" && caminho[3] && caminho[4]) {
        return roles.roleRemover(req, res);
    }
};

module.exports = rolesRoutes;