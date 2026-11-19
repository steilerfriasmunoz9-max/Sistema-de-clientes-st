(() => {
  const USERS = {
    steiler: { pass: "steilerfrias11", role: "admin" },
    pag123:  { pass: "s11",            role: "user"  }
  };
  const KEY = "sew_clients", SES = "sew_session";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = n => "RD$ " + Number(n || 0).toLocaleString("es-DO", { maximumFractionDigits: 2 });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = d => localStorage.setItem(KEY, JSON.stringify(d));
  let data = load(), session = null, editId = null;

  const toast = t => { const e = $("toast"); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2200); };
  const isAdmin = () => session && session.role === "admin";

  function start(s) {
    session = s; sessionStorage.setItem(SES, JSON.stringify(s));
    $("login").hidden = true; $("app").hidden = false;
    document.body.classList.toggle("is-user", s.role !== "admin");
    $("whoName").textContent = s.name;
    const t = $("roleTag"); t.textContent = s.role === "admin" ? "Administrador" : "Solo lectura"; t.className = "tag " + s.role;
    render();
  }
  $("loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const u = $("u").value.trim(), p = $("p").value, acc = USERS[u];
    if (acc && acc.pass === p) { $("err").hidden = true; start({ name: u, role: acc.role }); }
    else { $("err").hidden = false; $("p").value = ""; }
  });
  $("logout").onclick = () => { sessionStorage.removeItem(SES); location.reload(); };

  function render() {
    const q = $("q").value.toLowerCase(), f = $("f").value;
    const list = data.filter(c => (!f || c.status === f) && [c.name, c.business, c.phone].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (b.created || 0) - (a.created || 0));
    const active = data.filter(c => c.status !== "Cancelado");
    const total = active.reduce((s, c) => s + +c.price, 0), paid = active.reduce((s, c) => s + +c.paid, 0);
    const cnt = s => data.filter(c => c.status === s).length;
    const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    $("stats").innerHTML = stat(data.length, "Clientes en total") + stat(cnt("Pendiente"), "Pendientes") +
      stat(cnt("En proceso"), "En proceso") + stat(cnt("Entregado"), "Entregados") +
      stat(money(total), "Valor total") + stat(money(total - paid), "Por cobrar");
    $("empty").hidden = list.length > 0;
    const today = new Date().toISOString().slice(0, 10);
    $("rows").innerHTML = list.map(c => {
      const late = c.due && c.due < today && !["Entregado", "Cancelado"].includes(c.status);
      const num = String(c.phone || "").replace(/\D/g, "").replace(/^1/, "");
      const wa = num ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/1${num}">WhatsApp</a>` : "";
      return `<tr><td><b>${esc(c.name)}</b><small>${esc(c.business)}</small><small>${esc(c.phone)}</small>${c.notes ? `<div class="note">${esc(c.notes)}</div>` : ""}</td>
        <td>${esc(c.type)}</td><td>${money(c.price)}</td>
        <td>${money(c.paid)}<small>Resta ${money(c.price - c.paid)}</small></td>
        <td><span class="st ${esc(c.status)}">${esc(c.status)}</span></td>
        <td class="${late ? "late" : ""}">${c.due ? esc(c.due) : "—"}${late ? "<small>Atrasado</small>" : ""}</td>
        <td><div class="row-actions">${wa}${isAdmin() ? `<button class="btn sm" data-e="${c.id}">Editar</button><button class="btn sm danger" data-d="${c.id}">Eliminar</button>` : ""}</div></td></tr>`;
    }).join("");
  }
  $("q").oninput = $("f").onchange = render;
  $("rows").addEventListener("click", e => {
    if (!isAdmin()) return;
    const ed = e.target.dataset.e, de = e.target.dataset.d;
    if (ed) openForm(ed);
    if (de && confirm("¿Eliminar este cliente? No se puede deshacer.")) { data = data.filter(c => c.id !== de); save(data); render(); toast("Cliente eliminado"); }
  });

  function openForm(id) {
    editId = id || null; const f = $("form"); f.reset();
    $("dlgTitle").textContent = id ? "Editar cliente" : "Nuevo cliente";
    if (id) { const c = data.find(x => x.id === id); for (const k of ["name","business","phone","type","price","paid","status","due","notes"]) f.elements[k].value = c[k] ?? ""; }
    $("dlg").showModal();
  }
  $("add").onclick = () => openForm();
  $("cancel").onclick = () => $("dlg").close();
  $("form").addEventListener("submit", () => {
    if (!isAdmin()) return;
    const o = Object.fromEntries(new FormData($("form")));
    o.price = +o.price || 0; o.paid = +o.paid || 0;
    if (editId) data = data.map(c => c.id === editId ? { ...c, ...o } : c);
    else data.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), created: Date.now(), ...o });
    save(data); render(); toast("Cliente guardado");
  });

  const download = (name, text, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
  $("csv").onclick = () => {
    const h = ["Nombre","Negocio","Teléfono","Tipo","Precio","Abonado","Estado","Entrega","Notas"];
    const rows = data.map(c => [c.name, c.business, c.phone, c.type, c.price, c.paid, c.status, c.due, c.notes].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    download("clientes.csv", "\ufeff" + [h.join(","), ...rows].join("\n"), "text/csv");
  };
  $("bk").onclick = () => download("respaldo-clientes.json", JSON.stringify(data, null, 2), "application/json");
  $("imp").onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (!Array.isArray(d)) throw 0; data = d; save(data); render(); toast("Respaldo importado"); } catch { alert("El archivo no es un respaldo válido."); } };
    r.readAsText(file); e.target.value = "";
  };

  const prev = sessionStorage.getItem(SES);
  if (prev) { try { start(JSON.parse(prev)); } catch {} }
})();
