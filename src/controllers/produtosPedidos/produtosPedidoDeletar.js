const produtosPedidoRepository = require("../../repositories/produtosPedidoRepository");

const produtosPedidoDeletar = async (req, res) => {

    const partes = req.url.split("/");

    const pedido_id = Number(partes[2]);
    const produto_id = Number(partes[3]);

    const result = await produtosPedidoRepository.deletar(
        pedido_id,
        produto_id
    );

    if (result.rows.length === 0) {

        res.writeHead(404, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            mensagem: "Produto do pedido não encontrado"
        }));

        return;
    }

    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        mensagem: "Produto do pedido deletado com sucesso"
    }));
};

module.exports = produtosPedidoDeletar;