
const logs = require("../controllers/logs");

const logsRoutes = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const partes = url.pathname.split("/");

    if (req.method === "GET" && url.pathname === "/logs") {
        req.query = Object.fromEntries(url.searchParams.entries());

        await logs.logsListar(req, res);
        return;
    }

    if (req.method === "POST" && url.pathname === "/logs/inserir") {
        let body = "";

        req.on("data", (chunk) => {
            body += chunk;
        });

        await new Promise((resolve) => {
            req.on("end", resolve);
        });

        req.body = JSON.parse(body || "{}");

        await logs.logsInserir(req, res);
        return;
    }

    if (
        req.method === "GET" &&
        partes[1] === "logs" &&
        partes[2] === "ler" &&
        partes[3]
    ) {
        req.params = {
            id: partes[3]
        };

        await logs.logsLer(req, res);
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        mensagem: "Rota de logs não encontrada"
    }));
};

module.exports = logsRoutes;
