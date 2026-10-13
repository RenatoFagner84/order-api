const produtosPedidoRepository = require("../../repositories/produtosPedidoRepository");

const produtosPedidoInserir = async (req, res) => {

    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", async () => {

        const dados = JSON.parse(body);

        const {
            pedido_id,
            produto_id,
            quantidade,
            valor_unitario
        } = dados;

        const result = await produtosPedidoRepository.inserir(
            pedido_id,
            produto_id,
            quantidade,
            valor_unitario
        );

        res.writeHead(201, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify(result.rows[0]));
    });
};

module.exports = produtosPedidoInserir;