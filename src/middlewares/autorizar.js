
const permissionRepository = require("../repositories/permissionRepository");

function normalizarRota(pathname) {
    return pathname
        .split("/")
        .map((parte) => /^\d+$/.test(parte) ? ":id" : parte)
        .join("/");
}

function responder(res, status, mensagem) {
    if (res.writableEnded || res.headersSent) {
        return;
    }

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({ mensagem }));
}

async function autorizar(req, res, proximo) {
    try {
        if (!req.usuario || !req.usuario.id) {
            responder(res, 401, "Usuário não autenticado.");
            return;
        }

        const url = new URL(req.url, "http://localhost");
        const rota = normalizarRota(url.pathname);
        const metodo = req.method.toUpperCase();

        if (
            metodo === "GET" &&
            /^\/pedido\/\d+$/.test(url.pathname)
        ) {
            proximo();
            return;
        }

        const permissao =
            await permissionRepository.buscarPermissaoPorRotaEMetodo(
                rota,
                metodo
            );

        if (!permissao) {
            responder(
                res,
                403,
                "Esta operação não possui permissão cadastrada."
            );
            return;
        }

        const permitido =
            await permissionRepository.usuarioTemPermissao(
                req.usuario.id,
                rota,
                metodo
            );

        if (!permitido) {
            responder(
                res,
                403,
                "Você não tem permissão para esta operação."
            );
            return;
        }

        proximo();
    } catch (erro) {
        console.error("[ERRO NA AUTORIZAÇÃO]", erro);

        responder(
            res,
            500,
            "Erro ao verificar as permissões."
        );
    }
}

module.exports = autorizar;
