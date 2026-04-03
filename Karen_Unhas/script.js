import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const horariosBloqueadosFixos = ["12:00"];

const form = document.getElementById("form-agendamento");
const inputData = document.getElementById("data");
const selectServico = document.getElementById("servico");
const selectHorario = document.getElementById("horario");

let agendamentos = [];
form.addEventListener("submit", agendarHorario);
inputData.addEventListener("change", validarData);
selectServico.addEventListener("change", atualizarHorarios);
selectHorario.addEventListener("change", esconderAvisoHorario);


async function carregarAgendamentosDoDia(dataSelecionada) {
    agendamentos = [];

    if (!dataSelecionada) return;

    const q = query(
        collection(db, "agendamentos"),
        where("data", "==", dataSelecionada),

    );

    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
        agendamentos.push({ id: docSnap.id, ...docSnap.data() });
    });

    agendamentos.sort((a, b) => (a.criadoEm || "").localeCompare(b.criadoEm || ""));
}

async function salvarAgendamento(agendamento) {
    await addDoc(collection(db, "agendamentos"), {
        ...agendamento,
        criadoEm: new Date().toISOString()
    });
}


async function agendarHorario(e) {
    e.preventDefault();
    esconderAvisoHorario();

    if (!selectHorario.value) {
        mostrarAviso("Selecione um horário disponível.");
        return;
    }

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const data = inputData.value;

    const servicoNome = selectServico.options[selectServico.selectedIndex].text;
    const duracao = Number(selectServico.value);
    const horarioInicial = selectHorario.value;

    await carregarAgendamentosDoDia(data);
    bloquearHorarios(data);

    const indexHorario = Array.from(selectHorario.options)
        .findIndex(opt => opt.value === horarioInicial);

    let horariosOcupados = [];

    for (let i = 0; i < duracao; i++) {
        const opcao = selectHorario.options[indexHorario + i];

        if (!opcao) {
            mostrarAviso("Esse serviço precisa de horários consecutivos disponíveis.");
            return;
        }


        if (horariosBloqueadosFixos.includes(opcao.value)) {
            mostrarAviso("Esse serviço não pode ultrapassar o horário de almoço.");
            return;
        }


        if (opcao.disabled) {
            mostrarAviso("Esse serviço precisa de horários consecutivos livres.");
            return;
        }


        if (i > 0) {
            const anterior = horariosOcupados[i - 1];
            const atual = opcao.value;

            if (paraMinutos(atual) - paraMinutos(anterior) !== 60) {
                mostrarAviso("Para Mão e Pé, precisa de 2 horários seguidos (ex: 10:00 e 11:00).");
                return;
            }
        }

        horariosOcupados.push(opcao.value);
    }


    const disponivel = horariosEstaoDisponiveis(data, horariosOcupados);
    if (!disponivel) {
        mostrarAviso("Esse horário já está reservado. Escolha outro.");
        return;
    }


    await salvarAgendamento({
        nome,
        telefone,
        data,
        horariosOcupados,
        servicoNome,
        duracao,
        status: "pendente"
    });


    await carregarAgendamentosDoDia(data);
    bloquearHorarios(data);

    enviarWhatsApp(nome, telefone, data, horarioInicial, servicoNome);
    form.reset();
}

async function validarData() {
    const aviso = document.getElementById("aviso-data");
    aviso.style.display = "none";

    const dataSelecionada = inputData.value;
    if (!dataSelecionada) return;

    const diaSemana = new Date(dataSelecionada + "T00:00:00").getDay();

    if (diaSemana === 1) {
        aviso.textContent = "Não atendemos às segundas-feiras.";
        aviso.style.display = "block";
        inputData.value = "";
        return;
    }

    await carregarAgendamentosDoDia(dataSelecionada);
    bloquearHorarios(dataSelecionada);
}

async function atualizarHorarios() {
    const opcoes = selectHorario.options;


    for (let i = 0; i < opcoes.length; i++) {
        opcoes[i].disabled = false;
    }


    Array.from(opcoes).forEach(opt => {
        if (horariosBloqueadosFixos.includes(opt.value)) {
            opt.disabled = true;
        }
    });

    if (inputData.value) {
        await carregarAgendamentosDoDia(inputData.value);
        bloquearHorarios(inputData.value);
    }
}

function bloquearHorarios(dataSelecionada) {
    const opcoes = selectHorario.options;


    for (let i = 0; i < opcoes.length; i++) {
        opcoes[i].disabled = false;
    }


    Array.from(opcoes).forEach(opt => {
        if (horariosBloqueadosFixos.includes(opt.value)) {
            opt.disabled = true;
        }
    });

    agendamentos
        .filter(a =>
            a.data === dataSelecionada &&
            (a.status === "pendente" || a.status === "confirmado")
        )
        .forEach(a => {
            a.horariosOcupados.forEach(h => {
                const index = Array.from(opcoes).findIndex(opt => opt.value === h);
                if (index !== -1) {
                    opcoes[index].disabled = true;
                }
            });
        });
}

function horariosEstaoDisponiveis(data, horariosNecessarios) {
    return !agendamentos
        .filter(a =>
            a.data === data &&
            (a.status === "pendente" || a.status === "confirmado")
        )
        .some(a =>
            a.horariosOcupados.some(h => horariosNecessarios.includes(h))
        );
}


function esconderAvisoHorario() {
    const avisoHorario = document.getElementById("aviso-horario");
    avisoHorario.style.display = "none";
}

function mostrarAviso(mensagem) {
    const avisoHorario = document.getElementById("aviso-horario");
    avisoHorario.textContent = mensagem;
    avisoHorario.style.display = "block";
}

function enviarWhatsApp(nome, telefone, data, horario, servico) {
    const mensagem =
        `Olá! fiz um agendamento:

Cliente: ${nome}
Telefone: ${telefone}
Data: ${data}
Horário solicitado: ${horario}
Serviço: ${servico}

Agendamento pendente de confirmação.

Pode confirmar ou sugerir outro horário, por favor?`;

    const numeroProfissional = "5511954534733";
    const url = `https://wa.me/${numeroProfissional}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
}

function paraMinutos(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}


(async () => {
    if (inputData.value) {
        await carregarAgendamentosDoDia(inputData.value);
        bloquearHorarios(inputData.value);
    }
})();