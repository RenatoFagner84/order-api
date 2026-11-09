const cart = require("../controllers/cart");

const cartRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const caminho = url.pathname;

    if (req.method === "POST" && caminho === "/cart") {
        await cart.cartCriar(req, res);
        return;
    }

    if (req.method === "GET" && caminho === "/cart") {
        await cart.cartListarTodos(req, res);
        return;
    }

    const rotaConsultar = caminho.match(/^\/cart\/(\d+)$/);

    if (req.method === "GET" && rotaConsultar) {
        req.params = { id: rotaConsultar[1] };
        await cart.cartConsultar(req, res);
        return;
    }

    const rotaAdicionarProduto = caminho.match(/^\/cart\/(\d+)\/produtos$/);

    if (req.method === "POST" && rotaAdicionarProduto) {
        req.params = { id: rotaAdicionarProduto[1] };
        await cart.cartAdicionarProduto(req, res);
        return;
    }

    const rotaAtualizarProduto = caminho.match(/^\/cart\/(\d+)\/produtos\/(\d+)$/);

    if (req.method === "PUT" && rotaAtualizarProduto) {
        req.params = {
            id: rotaAtualizarProduto[1],
            produtoId: rotaAtualizarProduto[2]
        };
        await cart.cartAtualizarQuantidade(req, res);
        return;
    }

    if (req.method === "DELETE" && rotaAtualizarProduto) {
        req.params = {
            id: rotaAtualizarProduto[1],
            produtoId: rotaAtualizarProduto[2]
        };
        await cart.cartRemoverProduto(req, res);
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({
        mensagem: "Rota não encontrada"
    }));
};

module.exports = cartRoutes;