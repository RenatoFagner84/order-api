const cartRepository = require("../../repositories/cartRepository");

const cartAdicionarProduto = async (req, res) => {

    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", async () => {

        const dados = JSON.parse(body);

        const partes = req.url.split("/");

        const carrinho_id = Number(partes[2]);

        const {
            produto_id,
            quantidade
        } = dados;

        const carrinho = await cartRepository.consultar(carrinho_id);

        if (carrinho.rows.length === 0) {

            res.writeHead(404, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                mensagem: "Carrinho não encontrado"
            }));

            return;
        }

        const result = await cartRepository.adicionarProduto(
            carrinho_id,
            produto_id,
            quantidade
        );

        res.writeHead(201, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify(result.rows[0]));
    });
};

module.exports = cartAdicionarProduto;