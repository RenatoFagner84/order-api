const pedidosRepository = require("../../repositories/pedidosRepository");

const pedidosOcultar = async (req, res) => {

    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", async () => {

        const dados = JSON.parse(body);

        const {
            id
        } = dados;

        const result = await pedidosRepository.ocultar(id);

        if (result.rows.length === 0) {

            res.writeHead(404, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                mensagem: "Pedido não encontrado"
            }));

            return;
        }

        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            mensagem: "Pedido ocultado com sucesso"
        }));
    });
};

module.exports = pedidosOcultar;