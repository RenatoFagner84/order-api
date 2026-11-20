
jest.mock("../../src/controllers/users/usersLer", () => jest.fn());
jest.mock("../../src/controllers/users/usersLerId", () => jest.fn());
jest.mock("../../src/controllers/users/usersBuscar", () => jest.fn());
jest.mock("../../src/controllers/users/usersInserir", () => jest.fn());
jest.mock("../../src/controllers/users/usersAtualizar", () => jest.fn());
jest.mock("../../src/controllers/users/usersDeletar", () => jest.fn());
jest.mock("../../src/controllers/users/usersHistoricoStatus", () => jest.fn());
jest.mock("../../src/controllers/users/usersLogin", () => jest.fn());
jest.mock("../../src/controllers/users/usersRecuperarSenha", () => jest.fn());
jest.mock("../../src/controllers/users/usersVerificarPin", () => jest.fn());
jest.mock("../../src/controllers/users/usersRedefinirSenha", () => jest.fn());

const controllers = require("../../src/controllers/users");

describe("Módulo de controllers de usuários", () => {
    const controllersEsperados = [
        "usersLer",
        "usersLerId",
        "usersBuscar",
        "usersInserir",
        "usersAtualizar",
        "usersDeletar",
        "usersHistoricoStatus",
        "usersLogin",
        "usersRecuperarSenha",
        "usersVerificarPin",
        "usersRedefinirSenha"
    ];

    test("deve exportar todos os controllers esperados", () => {
        controllersEsperados.forEach((nome) => {
            expect(controllers).toHaveProperty(nome);
        });
    });

    test("deve exportar cada controller como uma função", () => {
        controllersEsperados.forEach((nome) => {
            expect(typeof controllers[nome]).toBe("function");
        });
    });

    test("deve exportar exatamente os onze controllers", () => {
        expect(Object.keys(controllers)).toHaveLength(11);
        expect(Object.keys(controllers).sort()).toEqual(
            [...controllersEsperados].sort()
        );
    });
});
