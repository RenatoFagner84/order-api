describe("Módulo de controllers de usuários", () => {
    jest.mock("../../src/controllers/users/usersLer", () => jest.fn());
    jest.mock("../../src/controllers/users/usersLerId", () => jest.fn());
    jest.mock("../../src/controllers/users/usersBuscar", () => jest.fn());
    jest.mock("../../src/controllers/users/usersInserir", () => jest.fn());
    jest.mock("../../src/controllers/users/usersAtualizar", () => jest.fn());
    jest.mock("../../src/controllers/users/usersDeletar", () => jest.fn());
    jest.mock("../../src/controllers/users/usersHistoricoStatus", () => jest.fn());
    jest.mock("../../src/controllers/users/usersLogin", () => jest.fn());

    const controllers = require("../../src/controllers/users");

    test("deve exportar todos os controllers esperados", () => {
        expect(controllers).toHaveProperty("usersLer");
        expect(controllers).toHaveProperty("usersLerId");
        expect(controllers).toHaveProperty("usersBuscar");
        expect(controllers).toHaveProperty("usersInserir");
        expect(controllers).toHaveProperty("usersAtualizar");
        expect(controllers).toHaveProperty("usersDeletar");
        expect(controllers).toHaveProperty("usersHistoricoStatus");
        expect(controllers).toHaveProperty("usersLogin");
    });

    test("deve exportar cada controller como uma função", () => {
        expect(typeof controllers.usersLer).toBe("function");
        expect(typeof controllers.usersLerId).toBe("function");
        expect(typeof controllers.usersBuscar).toBe("function");
        expect(typeof controllers.usersInserir).toBe("function");
        expect(typeof controllers.usersAtualizar).toBe("function");
        expect(typeof controllers.usersDeletar).toBe("function");
        expect(typeof controllers.usersHistoricoStatus).toBe("function");
        expect(typeof controllers.usersLogin).toBe("function");
    });

    test("deve exportar exatamente os oito controllers", () => {
        expect(Object.keys(controllers)).toHaveLength(8);
    });
});
