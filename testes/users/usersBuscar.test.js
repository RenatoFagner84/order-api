const userRepository = require("../../src/repositories/userRepository");
const usersBuscar = require("../../src/controllers/users/usersBuscar");

jest.mock("../../src/repositories/userRepository", () => ({
  buscarPorNome: jest.fn()
}));

describe("usersBuscar", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      url: "/users?nome=Joao"
    };

    res = {
      writeHead: jest.fn(),
      end: jest.fn()
    };
  });

  describe("validação dos parâmetros", () => {
    test("deve retornar 400 quando o nome não for informado", async () => {
      req.url = "/users";

      await usersBuscar(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(400, {
        "Content-Type": "application/json"
      });

      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({
          mensagem: "Informe o nome do user"
        })
      );

      expect(userRepository.buscarPorNome).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o nome estiver vazio", async () => {
      req.url = "/users?nome=";

      await usersBuscar(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(400, {
        "Content-Type": "application/json"
      });

      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({
          mensagem: "Informe o nome do user"
        })
      );

      expect(userRepository.buscarPorNome).not.toHaveBeenCalled();
    });

    test("deve retornar 400 quando o parâmetro nome estiver ausente", async () => {
      req.url = "/users?email=joao@email.com";

      await usersBuscar(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(400, {
  "Content-Type": "application/json"
});

      expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
        mensagem: "Informe o nome do user"
      });
    });
  });

  describe("busca de usuários", () => {
    test("deve retornar 200 e os usuários encontrados", async () => {
      const usuarios = [
        {
          id: 1,
          nome: "Joao Silva",
          email: "joao@email.com"
        },
        {
          id: 2,
          nome: "Joao Santos",
          email: "santos@email.com"
        }
      ];

      userRepository.buscarPorNome.mockResolvedValue({
        rows: usuarios
      });

      await usersBuscar(req, res);

      expect(userRepository.buscarPorNome).toHaveBeenCalledWith("Joao");

      expect(res.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json"
      });

      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify(usuarios)
      );
    });

    test("deve retornar 404 quando nenhum usuário for encontrado", async () => {
      userRepository.buscarPorNome.mockResolvedValue({
        rows: []
      });

      await usersBuscar(req, res);

      expect(userRepository.buscarPorNome).toHaveBeenCalledWith("Joao");

      expect(res.writeHead).toHaveBeenCalledWith(404, {
        "Content-Type": "application/json"
      });

      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({
          mensagem: "User não encontrado"
        })
      );
    });

    test("deve decodificar caracteres especiais do nome na URL", async () => {
      req.url = "/users?nome=Jo%C3%A3o%20Silva";

      userRepository.buscarPorNome.mockResolvedValue({
        rows: [
          {
            id: 1,
            nome: "João Silva"
          }
        ]
      });

      await usersBuscar(req, res);

      expect(userRepository.buscarPorNome).toHaveBeenCalledWith(
        "João Silva"
      );

      expect(res.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json"
      });
    });

    test("deve buscar pelo nome mesmo quando existirem outros parâmetros", async () => {
      req.url = "/users?nome=Maria&ativo=true";

      userRepository.buscarPorNome.mockResolvedValue({
        rows: [
          {
            id: 3,
            nome: "Maria"
          }
        ]
      });

      await usersBuscar(req, res);

      expect(userRepository.buscarPorNome).toHaveBeenCalledWith(
        "Maria"
      );

      expect(res.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json"
      });
    });
  });

  describe("tratamento de erros", () => {
    test("deve rejeitar a Promise quando o repositório lançar um erro", async () => {
      userRepository.buscarPorNome.mockRejectedValue(
        new Error("Erro no banco de dados")
      );

      await expect(usersBuscar(req, res)).rejects.toThrow(
        "Erro no banco de dados"
      );
    });
  });
});
