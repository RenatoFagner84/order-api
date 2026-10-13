const cartRepository = require("../../repositories/cartRepository");

const cartRemoverProduto = async (req, res) => {

    const partes = req.url.split("/");

    const carrinho_id = Number(partes[2]);
    const produto_id = Number(partes[4]);

    const result = await cartRepository.removerProduto(
        carrinho_id,
        produto_id
    );

    if (result.rows.length === 0) {

        res.writeHead(404, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            mensagem: "Produto do carrinho não encontrado"
        }));

        return;
    }

    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        mensagem: "Produto removido do carrinho com sucesso"
    }));
};

module.exports = cartRemoverProduto;