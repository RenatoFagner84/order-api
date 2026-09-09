const http = require("http");
const routes = require("./routes");

const server = http.createServer(async (req, res) => {

    if (req.url.startsWith("/cliente")) {
        await routes.clientesRoutes(req, res);
        return;
    }

    if (req.url.startsWith("/produto")) {
        await routes.produtosRoutes(req, res);
        return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Rota não encontrada");
});

server.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});