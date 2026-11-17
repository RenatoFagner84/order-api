
const { rateLimit } = require("express-rate-limit");

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        mensagem: "Verifique os dados e tente novamente mais tarde."
    }
});


const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        mensagem: "Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente."
    }
});


const recuperarSenhaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        mensagem: "Muitas solicitações de recuperação de senha. Aguarde 15 minutos antes de tentar novamente."
    }
});

const verificarPinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        mensagem: "Muitas tentativas de verificação do PIN. Aguarde 15 minutos antes de tentar novamente."
    }
});


const redefinirSenhaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        mensagem: "Muitas tentativas de redefinição de senha. Aguarde 15 minutos antes de tentar novamente."
    }
});

module.exports = {
    apiLimiter,
    loginLimiter,
    recuperarSenhaLimiter,
    verificarPinLimiter,
    redefinirSenhaLimiter
};
