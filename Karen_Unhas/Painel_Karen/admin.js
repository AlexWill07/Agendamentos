import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const inputData = document.getElementById("filtroData");
const btnRecarregar = document.getElementById("btnRecarregar");

const listaPendentes = document.getElementById("listaPendentes");
const listaConfirmados = document.getElementById("listaConfirmados");
const listaCancelados = document.getElementById("listaCancelados");
const countPendentes = document.getElementById("countPendentes");
const countConfirmados = document.getElementById("countConfirmados");
const countCancelados = document.getElementById("countCancelados");

btnRecarregar?.addEventListener("click", () => carregarPainel());
inputData?.addEventListener("change", () => carregarPainel());

function limparListas() {
  listaPendentes.innerHTML = "";
  listaConfirmados.innerHTML = "";
  listaCancelados.innerHTML = "";
}

function criarCardAgendamento(a) {
  const statusSeguro = (a.status || "pendente").toString().toLowerCase().trim();

  const div = document.createElement("div");
  div.className = "card-agendamento";

  const horariosTxt = Array.isArray(a.horariosOcupados)
    ? a.horariosOcupados.join("–")
    : (a.horario || "");

  div.innerHTML = `
    <div><b>Cliente:</b> ${a.nome || "-"}</div>
    <div><b>Telefone:</b> ${a.telefone || "-"}</div>
    <div><b>Data:</b> ${a.data || "-"}</div>
    <div><b>Horário:</b> ${horariosTxt}</div>
    <div><b>Serviço:</b> ${a.servicoNome || "-"}</div>
    <div><b>Status:</b> ${statusSeguro}</div>
    ${
      statusSeguro === "pendente"
        ? `
        <div class="acoes">
          <button class="btn-confirmar">Confirmar</button>
          <button class="btn-cancelar">Cancelar</button>
        </div>
      `
        : ""
    }
  `;

  if (statusSeguro === "pendente") {
    div.querySelector(".btn-confirmar").addEventListener("click", async () => {
      await atualizarStatus(a.id, "confirmado");
      carregarPainel();
    });

    div.querySelector(".btn-cancelar").addEventListener("click", async () => {
      await atualizarStatus(a.id, "cancelado");
      carregarPainel();
    });
  }

  return { div, statusSeguro };
}

async function atualizarStatus(id, novoStatus) {
  const ref = doc(db, "agendamentos", id);
  await updateDoc(ref, { status: novoStatus });
}

async function carregarPainel() {
  const filtroData = document.getElementById("filtroData");
  const dataSelecionada = filtroData.value;
  if (!dataSelecionada) return;

  limparListas();

  // zera contadores
  let qtdPendentes = 0;
  let qtdConfirmados = 0;
  let qtdCancelados = 0;

  const q = query(
    collection(db, "agendamentos"),
    where("data", "==", dataSelecionada)
    // (se você quiser ordenar no Firestore depois, dá pra adicionar orderBy aqui)
  );

  const snap = await getDocs(q);

  const ags = [];
  snap.forEach((docSnap) => {
    ags.push({ id: docSnap.id, ...docSnap.data() });
  });

  // ordenação local
  ags.sort((a, b) => (a.criadoEm || "").localeCompare(b.criadoEm || ""));

  ags.forEach((a) => {
    const { div, statusSeguro } = criarCardAgendamento(a);

    if (statusSeguro === "confirmado") {
      qtdConfirmados++;
      listaConfirmados.appendChild(div);
    } else if (statusSeguro === "cancelado") {
      qtdCancelados++;
      listaCancelados.appendChild(div);
    } else {
      qtdPendentes++;
      listaPendentes.appendChild(div);
    }
  });

  
  if (countPendentes) countPendentes.textContent = qtdPendentes;
  if (countConfirmados) countConfirmados.textContent = qtdConfirmados;
  if (countCancelados) countCancelados.textContent = qtdCancelados;
}

// ===== Tabs (abas) =====
const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".tab-panel");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});
carregarPainel();