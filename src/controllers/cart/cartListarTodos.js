const cartRepository = require("../../repositories/cartRepository");

const cartListarTodos = async (req, res) => {

    const result = await cartRepository.listarTodos();

    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify(result.rows));
};

module.exports = cartListarTodos;