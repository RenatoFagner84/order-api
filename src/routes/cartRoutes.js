const cart = require("../controllers/cart");

const cartRoutes = async (req, res) => {

    if (
        req.method === "POST" &&
        req.url === "/cart"
    ) {
        await cart.cartCriar(req, res);
        return;
    }

    if (
        req.method === "GET" &&
        req.url === "/cart"
    ) {
        await cart.cartListarTodos(req, res);
        return;
    }

    if (
        req.method === "GET" &&
        /^\/cart\/\d+$/.test(req.url)
    ) {
        await cart.cartConsultar(req, res);
        return;
    }

    if (
        req.method === "POST" &&
        /^\/cart\/\d+\/produtos$/.test(req.url)
    ) {
        await cart.cartAdicionarProduto(req, res);
        return;
    }

    if (
        req.method === "PUT" &&
        /^\/cart\/\d+\/produtos\/\d+$/.test(req.url)
    ) {
        await cart.cartAtualizarQuantidade(req, res);
        return;
    }

    if (
        req.method === "DELETE" &&
        /^\/cart\/\d+\/produtos\/\d+$/.test(req.url)
    ) {
        await cart.cartRemoverProduto(req, res);
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        mensagem: "Rota não encontrada"
    }));
};

module.exports = cartRoutes;