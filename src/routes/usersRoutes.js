const user = require("../controllers/users");

const usersRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const partes = url.pathname.split("/");
    const acao = partes[2];

    // Login
    if (req.method === "POST" && acao === "login") {
        await user.usersLogin(req, res);
        return;
    }

    // Ler usuário por ID
    if (req.method === "GET" && acao === "ler" && partes[3]) {
        await user.usersLerId(req, res);
        return;
    }

    // Listar usuários
    if (req.method === "GET" && acao === "ler") {
        await user.usersLer(req, res);
        return;
    }

    // Buscar usuários
    if (req.method === "GET" && acao === "buscar") {
        await user.usersBuscar(req, res);
        return;
    }

    // Histórico de status
    if (req.method === "GET" && acao === "historico-status") {
        await user.usersHistoricoStatus(req, res);
        return;
    }

    // Cadastrar usuário
    if (req.method === "POST" && acao === "inserir") {
        await user.usersInserir(req, res);
        return;
    }

    // Atualizar usuário
    if (req.method === "PUT" && acao === "atualizar") {
        await user.usersAtualizar(req, res);
        return;
    }

    // Desativar usuário
    if (req.method === "DELETE" && acao === "deletar") {
        await user.usersDeletar(req, res);
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({
        mensagem: "Rota de users não encontrada"
    }));
};

module.exports = usersRoutes;