
const express = require("express");
const roles = require("../controllers/roles");

const router = express.Router();

router.get("/roles/ler", async (req, res, next) => {
    try {
        await roles.roleLer(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.get("/roles/user/:userId", async (req, res, next) => {
    try {
        await roles.rolesPorUser(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.post("/roles/user/:userId", async (req, res, next) => {
    try {
        await roles.roleAtribuir(req, res);
    } catch (erro) {
        next(erro);
    }
});

router.delete("/roles/user/:userId/:roleId", async (req, res, next) => {
    try {
        await roles.roleRemover(req, res);
    } catch (erro) {
        next(erro);
    }
});

module.exports = router;
