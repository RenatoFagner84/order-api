
const userRepository = require("../../repositories/userRepository");

const usersAtualizar = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensagem: "ID de usuário inválido."
            });
        }

        const dados = req.body;

        if (
            !dados ||
            typeof dados !== "object" ||
            Array.isArray(dados)
        ) {
            return res.status(400).json({
                mensagem: "Envie os dados do usuário em formato JSON."
            });
        }

        const {
            nome,
            email,
            telefone,
            status_id,
            enderecos
        } = dados;

        if (
            nome !== undefined &&
            (typeof nome !== "string" || !nome.trim())
        ) {
            return res.status(400).json({
                mensagem: "Nome inválido."
            });
        }

        if (
            email !== undefined &&
            (typeof email !== "string" || !email.trim())
        ) {
            return res.status(400).json({
                mensagem: "E-mail inválido."
            });
        }

        if (
            telefone !== undefined &&
            telefone !== null &&
            typeof telefone !== "string"
        ) {
            return res.status(400).json({
                mensagem: "Telefone inválido."
            });
        }

        if (
            status_id !== undefined &&
            (
                !Number.isInteger(Number(status_id)) ||
                Number(status_id) <= 0
            )
        ) {
            return res.status(400).json({
                mensagem: "Status inválido."
            });
        }

        if (
            enderecos !== undefined &&
            (
                !Array.isArray(enderecos) ||
                enderecos.some((endereco) =>
                    !endereco ||
                    typeof endereco !== "object" ||
                    Array.isArray(endereco)
                )
            )
        ) {
            return res.status(400).json({
                mensagem: "A lista de endereços é inválida."
            });
        }

        const usuarioExistente = await userRepository.ler(id);

        if (
            !usuarioExistente ||
            usuarioExistente.rows.length === 0
        ) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        const resultado = await userRepository.atualizar(
            id,
            nome === undefined ? null : nome.trim(),
            email === undefined ? null : email.trim(),
            telefone === undefined ? null : telefone,
            status_id === undefined ? null : Number(status_id),
            enderecos
        );

        if (!resultado || resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado ou não atualizado."
            });
        }

        return res.status(200).json({
            mensagem: "Usuário atualizado com sucesso.",
            usuario: resultado.rows[0]
        });

    } catch (erro) {
        // Registra o erro no terminal, sem expor detalhes ao cliente.
        console.error("Erro ao atualizar usuário:", erro);

        return res.status(500).json({
            mensagem: "Erro interno ao atualizar usuário."
        });
    }
};

module.exports = usersAtualizar;
