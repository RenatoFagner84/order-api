
require("dotenv").config();

const { Pool } = require("pg");

const emProducao = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL;

let configuracao;

if (databaseUrl) {
    // Banco hospedado: Heroku Postgres ou outro PostgreSQL remoto.
    configuracao = {
        connectionString: databaseUrl,
        ssl: emProducao
            ? { rejectUnauthorized: false }
            : undefined,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
        max: 10
    };
} else {
    // Banco local: utiliza as configurações do seu arquivo .env.
    if (emProducao) {
        throw new Error(
            "DATABASE_URL não configurada. Configure o banco PostgreSQL no Heroku."
        );
    }

    configuracao = {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "portifolio",
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
        max: 10
    };
}

const pool = new Pool(configuracao);

pool.on("error", (erro) => {
    console.error(
        "[ERRO NA CONEXÃO COM O BANCO DE DADOS]",
        erro.message
    );
});

module.exports = pool;
