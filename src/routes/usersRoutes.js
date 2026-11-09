
const user = require("../controllers/users");

const responder = (res, status, mensagem) => {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({ mensagem }));
};

const usersRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const caminho = url.pathname;

    if (req.method === "POST" && caminho === "/users/login") {
        await user.usersLogin(req, res);
        return;
    }

    if (req.method === "POST" && caminho === "/users/inserir") {
        await user.usersInserir(req, res);
        return;
    }

    if (req.method === "POST" && caminho === "/users/recuperar-senha") {
        await user.usersRecuperarSenha(req, res);
        return;
    }

    if (req.method === "POST" && caminho === "/users/verificar-pin") {
        await user.usersVerificarPin(req, res);
        return;
    }

    if (req.method === "POST" && caminho === "/users/redefinir-senha") {
        await user.usersRedefinirSenha(req, res);
        return;
    }

    if (req.method === "GET" && caminho === "/users/buscar") {
        await user.usersBuscar(req, res);
        return;
    }

    if (req.method === "GET" && caminho === "/users") {
        await user.usersLer(req, res);
        return;
    }

    if (
        req.method === "GET" &&
        /^\/users\/\d+\/historico-status$/.test(caminho)
    ) {
        await user.usersHistoricoStatus(req, res);
        return;
    }

    if (req.method === "GET" && /^\/users\/\d+$/.test(caminho)) {
        await user.usersLerId(req, res);
        return;
    }

    if (req.method === "PUT" && /^\/users\/\d+$/.test(caminho)) {
        await user.usersAtualizar(req, res);
        return;
    }

    if (req.method === "DELETE" && /^\/users\/\d+$/.test(caminho)) {
        await user.usersDeletar(req, res);
        return;
    }

    responder(res, 404, "Rota de usuários não encontrada.");
};

module.exports = usersRoutes;
