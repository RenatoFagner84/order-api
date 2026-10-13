const produtosPedidoRepository = require("../../repositories/produtosPedidoRepository");

const produtosPedidoAtualizar = async (req, res) => {

    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", async () => {

        const dados = JSON.parse(body);

        const {
            quantidade,
            valor_unitario
        } = dados;

        const partes = req.url.split("/");

        const pedido_id = Number(partes[2]);
        const produto_id = Number(partes[3]);

        const result = await produtosPedidoRepository.atualizar(
            pedido_id,
            produto_id,
            quantidade,
            valor_unitario
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

        res.end(JSON.stringify(result.rows[0]));
    });
};

module.exports = produtosPedidoAtualizar;