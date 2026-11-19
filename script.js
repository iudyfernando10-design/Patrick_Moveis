/* ===========================================================
   Patrick Móveis On-line - script único de todo o sistema
   Cada página tem <body data-page="..."> e roda só o seu bloco.
   =========================================================== */

// ---------- Dados (salvos no localStorage) ----------
const CHAVE = "pm_dados";
const iniciais = {
  produtos: [
    { id: 1, nome: "Sofá 3 lugares", categoria: "Sofás", qtd: 6, preco: 2400 },
    { id: 2, nome: "Mesa de jantar 6 cadeiras", categoria: "Mesas", qtd: 3, preco: 1800 },
    { id: 3, nome: "Cama box casal", categoria: "Camas", qtd: 1, preco: 1500 }
  ],
  funcionarios: [
    { id: 1, nome: "Carlos Souza", cargo: "Vendedor", salario: 2200, tel: "(45) 99999-1111" }
  ],
  movs: []
};
let dados;
try { dados = JSON.parse(localStorage.getItem(CHAVE)) || iniciais; } catch { dados = iniciais; }
dados.terceirizados = dados.terceirizados || [];
dados.notas = dados.notas || [];
const salvar = () => localStorage.setItem(CHAVE, JSON.stringify(dados));

// ---------- Utilitários ----------
const $ = (id) => document.getElementById(id);
const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const quando = (iso) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const novoId = () => Date.now() + Math.floor(Math.random() * 1000);
// data local no formato AAAA-MM-DD
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
// segunda-feira da semana de d
function inicioSemana(d) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}
// quanto falta pagar aos terceirizados entre duas datas (AAAA-MM-DD)
const pendenteTerc = (a, b) =>
  Math.round(dados.notas.filter((n) => !n.pago && n.data >= a && n.data <= b)
    .reduce((s, n) => s + n.valor * n.pct / 100, 0) * 100) / 100;

function lancar(tipo, valor, desc) {
  dados.movs.unshift({ id: novoId(), tipo, valor: Number(valor), desc, data: new Date().toISOString() });
}
function totais() {
  const entradas = dados.movs.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
  const saidas = dados.movs.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);
  return { entradas, saidas, saldo: entradas - saidas };
}

let toastTimer;
function aviso(msg) {
  let t = $("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function animarNumero(el, fim, formatar = (n) => Math.round(n).toString(), duracao = 900) {
  const ini = performance.now();
  (function passo(agora) {
    const p = Math.min((agora - ini) / duracao, 1);
    el.textContent = formatar(fim * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(passo);
  })(ini);
}

// ---------- Layout comum (barra lateral, topo, rodapé, ícones) ----------
const ICONES = {
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  box: "M12 2 3 7v10l9 5 9-5V7l-9-5zm0 2.2 6.5 3.6L12 11.4 5.5 7.8 12 4.2zM5 9.5l6 3.3v6.9l-6-3.3V9.5zm8 10.2v-6.9l6-3.3v6.9l-6 3.3z",
  boxes: "M9 2h6v5H9zM2 9h6v5H2zm7 0h6v5H9zm7 0h6v5h-6zM2 15h20v7H2z",
  users: "M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  wallet: "M21 7H5a1 1 0 0 1 0-2h14V3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm-3 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z",
  exit: "M10 17l1.4-1.4L8.8 13H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z",
  cart: "M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM1 2v2h2l3.6 7.6-1.4 2.4A2 2 0 0 0 7 17h12v-2H7.4l1.1-2h7.5a2 2 0 0 0 1.75-1l3.6-6.5A1 1 0 0 0 20.5 4H5.2L4.3 2H1z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z",
  up: "M4 12l1.4 1.4L11 7.8V20h2V7.8l5.6 5.6L20 12l-8-8-8 8z",
  down: "M20 12l-1.4-1.4L13 16.2V4h-2v12.2l-5.6-5.6L4 12l8 8 8-8z",
  chev: "M7 10l5 5 5-5z",
  user: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z",
  tools: "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
  trend: "M2 20h4v-8H2v8zm6 0h4V8H8v12zm6 0h4v-6h-4v6zM3 10l6-5 4 3 7-6v3l-7 6-4-3-6 5v-3z"
};

const MENU = [
  ["inicio", "index.html", "home", "Início"],
  ["cadastrar", "cadastrar.html", "box", "Cadastrar Estoque"],
  ["estoque", "estoque.html", "boxes", "Olhar Estoque"],
  ["funcionarios", "funcionarios.html", "users", "Funcionários"],
  ["terceirizados", "terceirizados.html", "tools", "Terceirizados"],
  ["financeiro", "financeiro.html", "wallet", "Financeiro"]
];

function montarLayout(pagina) {
  const sprite = Object.entries(ICONES).map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24"><path d="${d}"/></symbol>`).join("");
  document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${sprite}</svg>`);

  $("sidebar").innerHTML = `
    <div class="logo-oval">
      <svg class="logo-sofa" viewBox="0 0 120 60" aria-hidden="true">
        <ellipse cx="38" cy="30" rx="34" ry="22" fill="#1f5fd1"/>
        <rect x="30" y="8" width="62" height="24" rx="9" fill="#f4f4f4"/>
        <rect x="14" y="26" width="92" height="22" rx="8" fill="#ececec"/>
        <rect x="8" y="24" width="18" height="28" rx="8" fill="#fafafa"/>
        <rect x="94" y="24" width="18" height="28" rx="8" fill="#fafafa"/>
        <rect x="20" y="50" width="5" height="7" rx="2" fill="#777"/>
        <rect x="95" y="50" width="5" height="7" rx="2" fill="#777"/>
      </svg>
      <div class="logo-title">Patrick Móveis</div>
      <div class="logo-online">ON-LINE</div>
      <div class="logo-addr">RUA EUNÁPIO DE QUEIRÓS<br>1228 MORUMBI, FOZ DO IGUAÇÚ</div>
    </div>
    <nav class="menu">
      ${MENU.map(([id, url, ic, nome]) => `<a href="${url}" class="menu-item${id === pagina ? " active" : ""}"><svg><use href="#i-${ic}"/></svg><span>${nome}</span></a>`).join("")}
      <hr />
      <a href="#" class="menu-item" id="btn-sair"><svg><use href="#i-exit"/></svg><span>Sair do Sistema</span></a>
    </nav>
    <div class="side-deco"></div>`;

  $("topbar").innerHTML = `
    <div class="brand"><h1>Patrick Móveis</h1><div class="brand-sub"><i></i><span>ON-LINE</span><i></i></div></div>
    <div class="user-area">
      <button class="user-btn" type="button"><svg class="ico"><use href="#i-user"/></svg><span>Administrador</span><svg class="ico small"><use href="#i-chev"/></svg></button>
      <div class="datetime" id="datetime"></div>
    </div>`;

  $("footer").innerHTML = `<div class="foot-line"><i></i><strong>PATRICK MÓVEIS ON-LINE</strong><i></i></div><span>Sua loja de móveis, sempre com você!</span>`;

  const relogio = () => {
    const d = new Date();
    $("datetime").textContent = `${d.toLocaleDateString("pt-BR")} - ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };
  relogio();
  setInterval(relogio, 15000);

  $("btn-sair").addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Deseja realmente sair do sistema?")) {
      aviso("Sessão encerrada. Até logo!");
      // window.location.href = "login.html";
    }
  });
}

// ================= PÁGINAS =================
const paginas = {

  // ---------- Início ----------
  inicio() {
    const t = totais();
    animarNumero($("stat-unidades"), dados.produtos.reduce((s, p) => s + p.qtd, 0));
    animarNumero($("stat-func"), dados.funcionarios.length);
    animarNumero($("stat-produtos"), dados.produtos.length);
    animarNumero($("stat-saldo"), t.saldo, reais);
    const semIni = inicioSemana(new Date()), semFim = new Date(semIni);
    semFim.setDate(semFim.getDate() + 6);
    animarNumero($("stat-terc"), pendenteTerc(iso(semIni), iso(semFim)), reais);
    $("fin-entradas").textContent = reais(t.entradas);
    $("fin-saidas").textContent = reais(t.saidas);
    $("fin-saldo").textContent = reais(t.saldo);

    const lista = $("move-list");
    lista.innerHTML = dados.movs.length ? "" : `<li><div class="d">Nenhuma movimentação ainda.</div></li>`;
    dados.movs.slice(0, 8).forEach((m, i) => {
      const ent = m.tipo === "entrada";
      const li = document.createElement("li");
      li.className = ent ? "in" : "out";
      li.style.animationDelay = `${i * 60}ms`;
      li.innerHTML = `<svg><use href="#${ent ? "i-up" : "i-down"}"/></svg>
        <div><div class="t">${ent ? "Entrada" : "Saída"} de <b>${reais(m.valor)}</b></div>
        <div class="d">${esc(m.desc)} • ${quando(m.data)}</div></div>`;
      lista.appendChild(li);
    });
  },

  // ---------- Cadastrar Estoque ----------
  cadastrar() {
    $("f-prod").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const qtd = parseInt(f.qtd.value, 10);
      const custo = parseFloat(f.custo.value) || 0;
      const nome = f.nome.value.trim();
      dados.produtos.push({ id: novoId(), nome, categoria: f.categoria.value, qtd, preco: parseFloat(f.preco.value) });
      if (f.compra.checked && custo > 0) lancar("saida", custo * qtd, `Compra: ${nome} (${qtd} un.)`);
      salvar();
      f.reset();
      f.compra.checked = true;
      aviso("Produto cadastrado!");
    });
  },

  // ---------- Olhar Estoque ----------
  estoque() {
    const corpo = $("tb-estoque");
    function desenhar() {
      const q = $("busca").value.trim().toLowerCase();
      const lista = dados.produtos.filter((p) => (p.nome + " " + p.categoria).toLowerCase().includes(q));
      $("resumo-estoque").textContent = `${lista.length} produto(s) • ${lista.reduce((s, p) => s + p.qtd, 0)} unidade(s)`;
      corpo.innerHTML = lista.length ? lista.map((p) => `
        <tr>
          <td>${esc(p.nome)}</td><td>${esc(p.categoria)}</td>
          <td>${p.qtd} ${p.qtd <= 2 ? '<span class="badge baixo">Baixo</span>' : ""}</td>
          <td>${reais(p.preco)}</td>
          <td>
            <button class="mini-btn" data-a="vender" data-id="${p.id}">Vender 1</button>
            <button class="mini-btn" data-a="repor" data-id="${p.id}">+1</button>
            <button class="mini-btn del" data-a="excluir" data-id="${p.id}">Excluir</button>
          </td>
        </tr>`).join("") : `<tr><td colspan="5" class="vazio">Nenhum produto encontrado.</td></tr>`;
    }
    corpo.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]");
      if (!b) return;
      const p = dados.produtos.find((x) => x.id === Number(b.dataset.id));
      if (!p) return;
      if (b.dataset.a === "vender") {
        if (p.qtd < 1) return aviso("Produto sem estoque!");
        p.qtd--;
        lancar("entrada", p.preco, `Venda: ${p.nome}`);
        aviso("Venda registrada no financeiro.");
      } else if (b.dataset.a === "repor") {
        p.qtd++;
      } else if (confirm(`Excluir "${p.nome}" do estoque?`)) {
        dados.produtos = dados.produtos.filter((x) => x.id !== p.id);
      }
      salvar();
      desenhar();
    });
    $("busca").addEventListener("input", desenhar);
    desenhar();
  },

  // ---------- Funcionários ----------
  funcionarios() {
    const corpo = $("tb-func");
    function desenhar() {
      corpo.innerHTML = dados.funcionarios.length ? dados.funcionarios.map((f) => `
        <tr>
          <td>${esc(f.nome)}</td><td>${esc(f.cargo)}</td><td>${esc(f.tel || "-")}</td><td>${reais(f.salario)}</td>
          <td>
            <button class="mini-btn" data-a="pagar" data-id="${f.id}">Pagar salário</button>
            <button class="mini-btn del" data-a="remover" data-id="${f.id}">Remover</button>
          </td>
        </tr>`).join("") : `<tr><td colspan="5" class="vazio">Nenhum funcionário cadastrado.</td></tr>`;
    }
    $("f-func").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      dados.funcionarios.push({ id: novoId(), nome: f.nome.value.trim(), cargo: f.cargo.value.trim(), salario: parseFloat(f.salario.value), tel: f.tel.value.trim() });
      salvar(); f.reset(); desenhar();
      aviso("Funcionário cadastrado!");
    });
    corpo.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]");
      if (!b) return;
      const f = dados.funcionarios.find((x) => x.id === Number(b.dataset.id));
      if (!f) return;
      if (b.dataset.a === "pagar") {
        lancar("saida", f.salario, `Salário: ${f.nome}`);
        aviso("Salário lançado como saída.");
      } else if (confirm(`Remover ${f.nome}?`)) {
        dados.funcionarios = dados.funcionarios.filter((x) => x.id !== f.id);
      }
      salvar(); desenhar();
    });
    desenhar();
  },

  // ---------- Terceirizados (pagos por montagem, fechamento semanal) ----------
  terceirizados() {
    let ini = inicioSemana(new Date());
    const sel = $("sel-terc");
    const fimDe = (d) => { const f = new Date(d); f.setDate(f.getDate() + 6); return f; };
    const dm = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const nomeDe = (id) => (dados.terceirizados.find((t) => t.id === id) || { nome: "(removido)" }).nome;
    const parte = (n) => n.valor * n.pct / 100;
    const soma = (arr, fn) => Math.round(arr.reduce((s, x) => s + fn(x), 0) * 100) / 100;

    function opcoes() {
      sel.innerHTML = dados.terceirizados.map((t) => `<option value="${t.id}">${esc(t.nome)} (${t.percentual}%)</option>`).join("")
        || `<option value="">Cadastre um terceirizado primeiro</option>`;
    }

    function desenhar() {
      const fim = fimDe(ini), a = iso(ini), b = iso(fim);
      $("sem-label").textContent = `Semana de ${dm(ini)} a ${dm(fim)}`;
      const notas = dados.notas.filter((n) => n.data >= a && n.data <= b).sort((x, y) => y.data.localeCompare(x.data));

      $("tb-resumo").innerHTML = dados.terceirizados.length ? dados.terceirizados.map((t) => {
        const ns = notas.filter((n) => n.terceirizadoId === t.id);
        const pend = soma(ns.filter((n) => !n.pago), parte);
        const status = !ns.length ? "-" : pend > 0 ? `<span class="badge baixo">Pendente</span>` : `<span class="badge in">Pago</span>`;
        return `<tr>
          <td>${esc(t.nome)}<br><small class="muted">${esc(t.tel || "")}</small></td>
          <td>${t.percentual}%</td><td>${ns.length}</td>
          <td>${reais(soma(ns, (n) => n.valor))}</td>
          <td class="yellow"><b>${reais(pend)}</b></td><td>${status}</td>
          <td>
            ${pend > 0 ? `<button class="mini-btn" data-a="pagar" data-id="${t.id}">Pagar semana</button>` : ""}
            <button class="mini-btn del" data-a="remover" data-id="${t.id}">Remover</button>
          </td></tr>`;
      }).join("") : `<tr><td colspan="7" class="vazio">Nenhum terceirizado cadastrado.</td></tr>`;

      $("tb-notas").innerHTML = notas.length ? notas.map((n) => `<tr>
          <td>${new Date(n.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
          <td>${esc(nomeDe(n.terceirizadoId))}</td><td>${esc(n.desc)}</td>
          <td>${reais(n.valor)}</td><td>${n.pct}% = ${reais(parte(n))}</td>
          <td>${n.pago ? '<span class="badge in">Pago</span>' : '<span class="badge baixo">Pendente</span>'}</td>
          <td>${n.pago ? "" : `<button class="mini-btn del" data-nota="${n.id}">Excluir</button>`}</td>
        </tr>`).join("") : `<tr><td colspan="7" class="vazio">Nenhuma nota nesta semana.</td></tr>`;

      $("total-semana").textContent = reais(pendenteTerc(a, b));
    }

    $("f-terc").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      dados.terceirizados.push({ id: novoId(), nome: f.nome.value.trim(), tel: f.tel.value.trim(), percentual: parseFloat(f.percentual.value) });
      salvar(); f.reset(); opcoes(); desenhar();
      aviso("Terceirizado cadastrado!");
    });

    $("f-nota").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const t = dados.terceirizados.find((x) => x.id === Number(sel.value));
      if (!t) return aviso("Cadastre um terceirizado primeiro.");
      dados.notas.push({ id: novoId(), terceirizadoId: t.id, desc: f.desc.value.trim(), valor: parseFloat(f.valor.value), pct: t.percentual, data: f.data.value, pago: false });
      salvar();
      f.desc.value = ""; f.valor.value = "";
      ini = inicioSemana(new Date(f.data.value + "T00:00:00")); // mostra a semana da nota lançada
      desenhar();
      aviso("Nota lançada!");
    });

    $("tb-resumo").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]");
      if (!b) return;
      const t = dados.terceirizados.find((x) => x.id === Number(b.dataset.id));
      if (!t) return;
      if (b.dataset.a === "pagar") {
        const a = iso(ini), fim = fimDe(ini), z = iso(fim);
        const pend = dados.notas.filter((n) => n.terceirizadoId === t.id && !n.pago && n.data >= a && n.data <= z);
        const valor = soma(pend, parte);
        if (!confirm(`Pagar ${reais(valor)} a ${t.nome} (${pend.length} nota(s), semana ${dm(ini)} a ${dm(fim)})?`)) return;
        lancar("saida", valor, `Pagamento semanal: ${t.nome} (${dm(ini)} a ${dm(fim)})`);
        pend.forEach((n) => (n.pago = true));
        aviso("Pagamento lançado como saída.");
      } else if (confirm(`Remover ${t.nome} e as notas dele ainda não pagas?`)) {
        dados.terceirizados = dados.terceirizados.filter((x) => x.id !== t.id);
        dados.notas = dados.notas.filter((n) => n.terceirizadoId !== t.id || n.pago);
        opcoes();
      }
      salvar(); desenhar();
    });

    $("tb-notas").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-nota]");
      if (b && confirm("Excluir esta nota?")) {
        dados.notas = dados.notas.filter((n) => n.id !== Number(b.dataset.nota));
        salvar(); desenhar();
      }
    });

    const mover = (dias) => { ini.setDate(ini.getDate() + dias); desenhar(); };
    $("sem-ant").addEventListener("click", () => mover(-7));
    $("sem-prox").addEventListener("click", () => mover(7));
    $("sem-hoje").addEventListener("click", () => { ini = inicioSemana(new Date()); desenhar(); });

    $("f-nota").data.value = iso(new Date());
    opcoes();
    desenhar();
  },

  // ---------- Financeiro ----------
  financeiro() {
    const corpo = $("tb-mov");
    function desenhar() {
      const t = totais();
      $("fin-entradas").textContent = reais(t.entradas);
      $("fin-saidas").textContent = reais(t.saidas);
      $("fin-saldo").textContent = reais(t.saldo);
      const filtro = $("filtro").value;
      const lista = dados.movs.filter((m) => !filtro || m.tipo === filtro);
      corpo.innerHTML = lista.length ? lista.map((m) => `
        <tr>
          <td>${quando(m.data)}</td>
          <td><span class="badge ${m.tipo === "entrada" ? "in" : "out"}">${m.tipo === "entrada" ? "Entrada" : "Saída"}</span></td>
          <td>${esc(m.desc)}</td>
          <td class="${m.tipo === "entrada" ? "green" : "red"}">${reais(m.valor)}</td>
          <td><button class="mini-btn del" data-id="${m.id}">Excluir</button></td>
        </tr>`).join("") : `<tr><td colspan="5" class="vazio">Nenhum lançamento.</td></tr>`;
    }
    $("f-mov").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      lancar(f.tipo.value, parseFloat(f.valor.value), f.desc.value.trim());
      salvar(); f.reset(); desenhar();
      aviso("Lançamento registrado!");
    });
    corpo.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-id]");
      if (b && confirm("Excluir este lançamento?")) {
        dados.movs = dados.movs.filter((m) => m.id !== Number(b.dataset.id));
        salvar(); desenhar();
      }
    });
    $("filtro").addEventListener("change", desenhar);
    desenhar();
  }
};

// ---------- Início do sistema ----------
const paginaAtual = document.body.dataset.page;
montarLayout(paginaAtual);
paginas[paginaAtual]();