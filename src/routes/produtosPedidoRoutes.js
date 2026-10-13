const produtosPedido = require("../controllers/produtosPedidos");

const produtosPedidoRoutes = async (req, res) => {

    // GET - consultar
    if (
        req.method === "GET" &&
        req.url === "/produtos-pedido"
    ) {
        await produtosPedido.produtosPedidoLer(req, res);
        return;
    }

    // POST - inserir
    if (
        req.method === "POST" &&
        req.url === "/produtos-pedido"
    ) {
        await produtosPedido.produtosPedidoInserir(req, res);
        return;
    }

    // PUT - atualizar
    if (
        req.method === "PUT" &&
        /^\/produtos-pedido\/\d+\/\d+$/.test(req.url)
    ) {
        await produtosPedido.produtosPedidoAtualizar(req, res);
        return;
    }

    // DELETE - deletar
    if (
        req.method === "DELETE" &&
        /^\/produtos-pedido\/\d+\/\d+$/.test(req.url)
    ) {
        await produtosPedido.produtosPedidoDeletar(req, res);
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        mensagem: "Rota não encontrada"
    }));
};

module.exports = produtosPedidoRoutes;