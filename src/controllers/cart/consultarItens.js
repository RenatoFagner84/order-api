const cartRepository = require("../../repositories/cartRepository");

const cartConsultarItens = async (req, res) => {

    const partes = req.url.split("/");

    const carrinho_id = Number(partes[2]);

    const result = await cartRepository.consultarItens(carrinho_id);

    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify(result.rows));
};

module.exports = cartConsultarItens;