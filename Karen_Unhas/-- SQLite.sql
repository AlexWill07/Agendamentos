-- SQLite
CREATE TABLE agendamentos (
id INTEGER PRIMARY KEY AUTOINCREMENT,

nome_cliente TEXT NOT NULL,

telefone TEXT NOT NULL,

data TEXT NOT NULL,

horario TEXT NOT NULL,

UNIQUE (data, horario)
);