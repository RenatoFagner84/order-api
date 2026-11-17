
const express = require("express");
const user = require("../controllers/users");

const router = express.Router();

// Autenticação e cadastro
router.post("/users/login", user.usersLogin);
router.post("/users/inserir", user.usersInserir);
router.post("/users/recuperar-senha", user.usersRecuperarSenha);
router.post("/users/verificar-pin", user.usersVerificarPin);
router.post("/users/redefinir-senha", user.usersRedefinirSenha);

// Consultas
router.get("/users/buscar", user.usersBuscar);
router.get("/users/ler", user.usersLer);
router.get("/users/ler/:id", user.usersLerId);

// Atualização e exclusão
router.put("/users/atualizar/:id", user.usersAtualizar);
router.delete("/users/deletar/:id", user.usersDeletar);

module.exports = router;
