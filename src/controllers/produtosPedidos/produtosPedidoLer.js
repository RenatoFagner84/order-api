const produtosPedidoRepository = require("../../repositories/produtosPedidoRepository");

const produtosPedidoLer = async (req, res) => {

    const result = await produtosPedidoRepository.lerTudo();

    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify(result.rows));
};

module.exports = produtosPedidoLer;