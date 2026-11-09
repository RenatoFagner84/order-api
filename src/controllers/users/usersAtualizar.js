const userRepository = require("../../repositories/userRepository");

const responder = (res, status, dados) => {
    if (res.writableEnded || res.headersSent) return;

    res.writeHead(status, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify(dados));
};

const extrairIdDaUrl = (req) => {
    const pathname = new URL(req.url || "http://localhost", "http://localhost").pathname;
    const partes = pathname.split("/").filter(Boolean);
    const idTexto = partes[partes.length - 1] || "";

    return idTexto;
};

const lerBody = async (req) => {
    return await new Promise((resolve, reject) => {
        let body = "";

        const limparListeners = () => {
            req.removeListener?.("data", onData);
            req.removeListener?.("end", onEnd);
            req.removeListener?.("error", onError);
        };

        const onData = (chunk) => {
            body += chunk.toString();

            if (body.length > 1024 * 1024) {
                limparListeners();
                reject(new Error("Corpo da requisição muito grande."));
            }
        };

        const onEnd = () => {
            limparListeners();

            try {
                if (!body.trim()) {
                    resolve({});
                    return;
                }

                resolve(JSON.parse(body));
            } catch {
                reject(new Error("Corpo da requisição JSON inválido."));
            }
        };

        const onError = (erro) => {
            limparListeners();
            reject(erro);
        };

        req.on("data", onData);
        req.on("end", onEnd);
        req.on("error", onError);
    });
};

const usersAtualizar = async (req, res) => {
    const idTexto = extrairIdDaUrl(req);
    const id = Number(idTexto);

    if (!/^\d+$/.test(idTexto) || !Number.isSafeInteger(id) || id <= 0) {
        responder(res, 400, {
            mensagem: "ID de usuário inválido."
        });
        return;
    }

    let dados;

    try {
        dados = await lerBody(req);
    } catch (erro) {
        const mensagem = erro.message === "Corpo da requisição muito grande."
            ? "Corpo da requisição muito grande."
            : "Corpo da requisição JSON inválido.";

        responder(res, erro.message === "Corpo da requisição muito grande." ? 413 : 400, {
            mensagem
        });
        return;
    }

    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
        responder(res, 400, {
            mensagem: "O corpo da requisição deve ser um objeto JSON."
        });
        return;
    }

    const { nome, email, telefone, status_id } = dados;

    if (
        (nome !== undefined && (typeof nome !== "string" || !nome.trim())) ||
        (email !== undefined && (typeof email !== "string" || !email.trim())) ||
        (telefone !== undefined && telefone !== null && typeof telefone !== "string") ||
        (status_id !== undefined && (!Number.isSafeInteger(Number(status_id)) || Number(status_id) <= 0))
    ) {
        responder(res, 400, {
            mensagem: "Informe nome, e-mail, telefone válido e status_id válido."
        });
        return;
    }

    const userExiste = await userRepository.ler(idTexto);

    if (userExiste.rows.length === 0) {
        responder(res, 404, {
            mensagem: "Usuario não encontrado"
        });
        return;
    }

    const resultado = await userRepository.atualizar(
        idTexto,
        typeof nome === "string" ? nome.trim() : undefined,
        typeof email === "string" ? email.trim() : undefined,
        telefone ?? undefined,
        status_id === undefined ? undefined : Number(status_id)
    );

    if (resultado.rows.length === 0) {
        responder(res, 404, {
            mensagem: "Usuario não encontrado"
        });
        return;
    }

    responder(res, 200, resultado.rows[0]);
};

module.exports = usersAtualizar;