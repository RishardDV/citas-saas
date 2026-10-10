'use strict';

// Panel de pruebas de AgendaFácil. JS plano, sin dependencias: lo sirve la
// propia API (main.ts → /app) y llama a los endpoints en el mismo origen.

/* ═════════════ Utilidades ═════════════ */

const $ = (sel, el = document) => el.querySelector(sel);
const pad = (n) => String(n).padStart(2, '0');

// Crea elementos del DOM sin innerHTML (así nada de lo que venga de la API se interpreta como HTML).
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, val);
        else el.style[p] = val;
      }
    } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Como append/replaceChildren, pero ignorando false/null (para usar `cond && h(...)`).
function poner(el, ...hijos) {
  el.append(...hijos.flat(Infinity).filter((c) => c != null && c !== false));
}
function llenar(el, ...hijos) {
  el.replaceChildren();
  poner(el, ...hijos);
}

const store = {
  get(k) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k, v) {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch { /* almacenamiento bloqueado: seguimos sin persistir */ }
  },
};

// Fechas: todo se muestra en la hora local del navegador.
const fmtHora = (d) => { const x = new Date(d); return `${pad(x.getHours())}:${pad(x.getMinutes())}`; };
const fmtDia = (d) => new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtPrecio = (p) => '$' + Number(p).toLocaleString('es-CO', { maximumFractionDigits: 2 });
const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const minDelDia = (d) => { const x = new Date(d); return x.getHours() * 60 + x.getMinutes(); };
const minAHora = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const horaAMin = (s) => { const [hh, mm] = s.split(':').map(Number); return hh * 60 + mm; };
const finDe = (cita) => new Date(new Date(cita.fecha).getTime() + cita.servicio.duracionMin * 60000);
// "2026-10-10" + "15:00" en hora local → ISO en UTC, que es lo que espera la API.
const aISO = (dia, hora) => new Date(`${dia}T${hora}`).toISOString();
const iniciales = (n) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/* ═════════════ Estado y API ═════════════ */

const state = {
  token: store.get('af_token'),
  user: null,
  renderSeq: 0,
  logCount: 0,
  agendaDia: null,
};

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function api(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const t0 = performance.now();
  let res;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    registrar({ method, path, body, status: 0, ms: performance.now() - t0, data: String(e) });
    throw new ApiError('No se pudo conectar con la API. ¿Está corriendo el servidor?', 0);
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  registrar({ method, path, body, status: res.status, ms: performance.now() - t0, data });

  if (!res.ok) {
    const m = data && data.message;
    const msg = Array.isArray(m) ? m.join(' · ') : m || `Error ${res.status}`;
    if (res.status === 401 && state.token && !path.startsWith('/auth/')) {
      cerrarSesion('Tu sesión expiró (el token dura 1 hora). Vuelve a entrar.');
    }
    throw new ApiError(msg, res.status, data);
  }
  return data;
}

/* ═════════════ Consola de API ═════════════ */

const aTexto = (v) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  if (s == null) return 'null';
  return s.length > 8000 ? s.slice(0, 8000) + '\n…' : s;
};

function registrar(e) {
  if (e.body && e.body.password) e.body = { ...e.body, password: '••••••••' };
  const tipo = e.status === 0 || e.status >= 500 ? 'err' : e.status < 300 ? 'ok' : 'warn';
  const item = h('details', { class: 'log-item' },
    h('summary', {},
      h('span', { class: `method m-${e.method.toLowerCase()}` }, e.method),
      h('span', { class: 'log-path', title: e.path }, e.path),
      h('span', { class: `status s-${tipo}` }, e.status || '—'),
      h('span', { class: 'muted small' }, `${Math.round(e.ms)} ms`)),
    h('div', { class: 'log-body' },
      e.body !== undefined && [h('div', { class: 'log-label' }, 'Body enviado'), h('pre', {}, aTexto(e.body))],
      h('div', { class: 'log-label' }, `Respuesta · ${new Date().toLocaleTimeString('es-CO')}`),
      h('pre', {}, aTexto(e.data))));
  const lista = $('#log-list');
  $('.log-empty', lista)?.remove();
  lista.prepend(item);
  while (lista.children.length > 150) lista.lastElementChild.remove();
  $('#log-count').textContent = ++state.logCount;
}

function limpiarLog() {
  state.logCount = 0;
  $('#log-count').textContent = '0';
  $('#log-list').replaceChildren(h('p', { class: 'log-empty muted small' }, 'Todavía no hay peticiones.'));
}

function mostrarLog(abrir) {
  $('#log').hidden = !abrir;
  $('#btn-log').setAttribute('aria-expanded', String(abrir));
  store.set('af_log', abrir ? '1' : '0');
}

/* ═════════════ Piezas de UI ═════════════ */

function toast(msg, tipo = 'ok') {
  const t = h('div', { class: `toast t-${tipo}`, role: 'status' }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 4200);
}

function encabezado(titulo, sub, ...acciones) {
  return h('div', { class: 'page-head' },
    h('div', {}, h('h1', {}, titulo), sub && h('p', { class: 'muted' }, sub)),
    acciones.length > 0 && h('div', { class: 'toolbar' }, acciones));
}

function vacio(titulo, texto) {
  return h('div', { class: 'empty' }, h('strong', {}, titulo), texto && h('p', { class: 'muted' }, texto));
}

function cajaError(e) {
  const pistas = {
    0: 'Arranca la API con npm run start:dev.',
    403: 'La API solo deja hacer esto al dueño del negocio.',
    404: 'Revisa que el ID exista.',
  };
  return h('div', { class: 'callout error' },
    h('strong', {}, e.status ? `Error ${e.status}` : 'Error'),
    h('p', {}, e.message),
    pistas[e.status] && h('p', { class: 'small' }, pistas[e.status]));
}

function estadoBadge(estado) {
  return h('span', { class: `badge e-${estado.toLowerCase()}` }, estado);
}

function tabla(columnas, filas) {
  return h('div', { class: 'table-wrap' },
    h('table', {},
      h('thead', {}, h('tr', {}, columnas.map((c) => h('th', {}, c)))),
      h('tbody', {}, filas.map((f) => h('tr', {}, f.map((c) => h('td', {}, c)))))));
}

function tablaCitas(citas, { cliente = false, negocio = false } = {}) {
  const cols = ['ID', 'Fecha', 'Hora', negocio && 'Negocio', 'Servicio', 'Profesional', cliente && 'Cliente', 'Estado', 'Notas'];
  return tabla(cols.filter(Boolean), citas.map((c) => [
    `#${c.id}`,
    fmtDia(c.fecha),
    c.servicio.duracionMin ? `${fmtHora(c.fecha)}–${fmtHora(finDe(c))}` : fmtHora(c.fecha),
    negocio && c.negocio.nombre,
    c.servicio.nombre,
    c.profesional.nombre,
    cliente && c.cliente.nombre,
    estadoBadge(c.estado),
    c.notas || '—',
  ].filter((x) => x !== false)));
}

function campo({ name, label, type = 'text', hint, options, value, ...rest }) {
  let input;
  if (type === 'textarea') {
    input = h('textarea', { name, ...rest }, value ?? '');
  } else if (type === 'select') {
    input = h('select', { name, ...rest },
      options.map((o) => h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)));
  } else {
    input = h('input', { name, type, value, ...rest });
  }
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label),
    input,
    hint && h('small', { class: 'muted' }, hint));
}

// Formulario con manejo de errores de la API integrado. onSubmit recibe los
// valores no vacíos (como texto) y el propio <form>.
function formulario({ campos, enviar, onSubmit, cols }) {
  const error = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const boton = h('button', { class: 'btn primary', type: 'submit' }, enviar);
  const f = h('form', { class: `form ${cols ? `cols-${cols}` : ''}` }, campos, error, h('div', { class: 'form-actions' }, boton));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    error.hidden = true;
    boton.disabled = true;
    const datos = {};
    for (const [k, v] of new FormData(f)) {
      const s = String(v).trim();
      if (s !== '') datos[k] = s;
    }
    try {
      await onSubmit(datos, f);
    } catch (e) {
      error.textContent = e.message;
      error.hidden = false;
    } finally {
      boton.disabled = false;
    }
  });
  return f;
}

/* ═════════════ Sesión ═════════════ */

function tokenVigente(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64)).exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function iniciarSesion(token) {
  state.token = token;
  state.user = null;
  store.set('af_token', token);
  ir('#/negocios');
}

function cerrarSesion(msg) {
  state.token = null;
  state.user = null;
  store.set('af_token', null);
  if (msg) toast(msg, 'warn');
  render();
}

async function cargarUsuario() {
  try {
    state.user = await api('GET', '/perfil');
    pintarUsuario();
  } catch { /* el error ya queda en la consola */ }
}

function pintarUsuario() {
  const u = state.user;
  if (!u) return;
  $('#user-chip').replaceChildren(
    h('span', { class: 'avatar' }, iniciales(u.nombre)),
    h('span', { class: 'nombre' }, u.nombre),
    h('span', { class: `badge rol-${u.rol.toLowerCase()}`, title: 'Rol guardado en la base de datos' }, u.rol));
}

/* ═════════════ Router ═════════════ */

const rutas = [
  [/^#\/negocios$/, vistaNegocios, 'negocios'],
  [/^#\/negocio\/(\d+)(?:\/(servicios|profesionales|agenda|suscripcion|ia))?(?:\?pago=(ok|cancelado))?$/, vistaNegocio, 'negocios'],
  [/^#\/reservar(?:\?negocio=(\d+))?$/, vistaReservar, 'reservar'],
  [/^#\/mis-citas$/, vistaMisCitas, 'mis-citas'],
  [/^#\/perfil$/, vistaPerfil, 'perfil'],
];

function ir(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

async function render() {
  const seq = ++state.renderSeq;
  const main = $('#main');
  const logueado = Boolean(state.token);
  $('#nav').hidden = !logueado;
  $('#btn-logout').hidden = !logueado;
  $('#user-chip').hidden = !logueado;

  if (!logueado) {
    main.classList.remove('busy');
    main.replaceChildren(vistaAuth());
    return;
  }
  if (!state.user) cargarUsuario();

  const hash = location.hash || '#/negocios';
  const ruta = rutas.find(([re]) => re.test(hash));
  if (!ruta) {
    location.hash = '#/negocios';
    return;
  }
  const [re, vista, nav] = ruta;
  for (const a of document.querySelectorAll('#nav > a')) a.classList.toggle('active', a.dataset.nav === nav);

  if (!main.firstChild) main.append(h('p', { class: 'loading' }, 'Cargando…'));
  main.classList.add('busy');
  const cont = h('div', { class: 'view' });
  try {
    await vista(cont, ...hash.match(re).slice(1));
  } catch (e) {
    cont.replaceChildren(cajaError(e));
  }
  if (seq !== state.renderSeq) return; // el usuario ya navegó a otra parte
  main.classList.remove('busy');
  main.replaceChildren(cont);
}

/* ═════════════ Vistas ═════════════ */

function vistaAuth() {
  let modo = 'login';
  const wrap = h('div', { class: 'auth' });
  const pintar = () => {
    const esLogin = modo === 'login';
    wrap.replaceChildren(h('div', { class: 'card auth-card' },
      h('div', {},
        h('h1', {}, esLogin ? 'Inicia sesión' : 'Crea una cuenta'),
        h('p', { class: 'muted', style: { marginTop: '6px' } }, esLogin
          ? 'Entra con un usuario de tu base de datos local.'
          : 'Todo usuario nuevo es CLIENTE. Pasa a DUENO cuando crea su primer negocio.')),
      h('div', { class: 'seg', role: 'tablist' },
        h('button', { type: 'button', class: esLogin ? 'on' : '', onclick: () => { modo = 'login'; pintar(); } }, 'Entrar'),
        h('button', { type: 'button', class: esLogin ? '' : 'on', onclick: () => { modo = 'registro'; pintar(); } }, 'Registrarme')),
      formulario({
        campos: [
          !esLogin && campo({ name: 'nombre', label: 'Nombre', required: true, minlength: 2, placeholder: 'Don Pepe', autocomplete: 'name' }),
          campo({ name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'pepe@barberia.com', autocomplete: 'email' }),
          campo({
            name: 'password', label: 'Contraseña', type: 'password', required: true,
            minlength: esLogin ? null : 8,
            autocomplete: esLogin ? 'current-password' : 'new-password',
            hint: esLogin ? null : 'Mínimo 8 caracteres',
          }),
        ],
        enviar: esLogin ? 'Entrar' : 'Crear cuenta y entrar',
        onSubmit: async (d) => {
          if (!esLogin) {
            await api('POST', '/auth/register', d);
            toast('Cuenta creada');
          }
          const { access_token } = await api('POST', '/auth/login', { email: d.email, password: d.password });
          iniciarSesion(access_token);
        },
      })));
  };
  pintar();
  return wrap;
}

// ─── Mis negocios ───

async function vistaNegocios(cont) {
  const negocios = await api('GET', '/negocios');
  poner(cont,
    encabezado('Mis negocios', 'Los negocios de los que eres dueño. Entra en uno para gestionar sus servicios, sus profesionales y su agenda.'),
    negocios.length
      ? h('div', { class: 'grid cards' }, negocios.map((n) => h('a', { class: 'card card-link', href: `#/negocio/${n.id}` },
          h('div', { class: 'card-top' }, h('h3', {}, n.nombre), h('span', { class: 'id' }, `#${n.id}`)),
          n.descripcion && h('p', { class: 'muted small' }, n.descripcion),
          h('p', { class: 'small muted' }, [n.direccion, n.telefono].filter(Boolean).join(' · ') || 'Sin dirección ni teléfono'))))
      : vacio('Aún no tienes negocios', 'Crea el primero aquí abajo. Al hacerlo, tu rol pasa a DUENO.'),
    h('section', { class: 'card' },
      h('h2', {}, 'Crear negocio'),
      formulario({
        cols: 2,
        campos: [
          campo({ name: 'nombre', label: 'Nombre', required: true, minlength: 3, maxlength: 80, placeholder: 'Barbería Don Pepe' }),
          campo({ name: 'telefono', label: 'Teléfono', maxlength: 20, placeholder: '3001234567' }),
          campo({ name: 'direccion', label: 'Dirección', maxlength: 120, placeholder: 'Calle 3 # 4-5, Zipaquirá' }),
          campo({ name: 'descripcion', label: 'Descripción', type: 'textarea', rows: 2, maxlength: 300, placeholder: 'Cortes clásicos y arreglo de barba' }),
        ],
        enviar: 'Crear negocio',
        onSubmit: async (d) => {
          const n = await api('POST', '/negocios', d);
          toast(`Negocio “${n.nombre}” creado`);
          cargarUsuario(); // el rol acaba de cambiar a DUENO
          ir(`#/negocio/${n.id}/servicios`);
        },
      })));
}

// ─── Detalle de un negocio ───

async function vistaNegocio(cont, id, tab = 'servicios', pago) {
  const negocio = await api('GET', `/negocios/${id}`);
  const plan = negocio.suscripcion ? negocio.suscripcion.plan : 'FREE';
  const tabs = [['servicios', 'Servicios'], ['profesionales', 'Profesionales'], ['agenda', 'Agenda'], ['suscripcion', 'Suscripción'], ['ia', 'Asistente IA']];
  const cuerpo = h('div', { class: 'tab-body' });
  poner(cont,
    h('a', { class: 'back', href: '#/negocios' }, '← Mis negocios'),
    encabezado(
      `${negocio.nombre}`,
      [negocio.descripcion, negocio.direccion, negocio.telefono].filter(Boolean).join(' · ') || `Negocio #${negocio.id}`,
      h('a', { class: `badge plan-${plan.toLowerCase()}`, href: `#/negocio/${id}/suscripcion`, title: 'Ver suscripción' }, `Plan ${plan}`),
      h('a', { class: 'btn primary', href: `#/reservar?negocio=${id}` }, 'Reservar aquí')),
    h('nav', { class: 'tabs', 'aria-label': 'Secciones del negocio' },
      tabs.map(([k, label]) => h('a', { class: k === tab ? 'on' : '', href: `#/negocio/${id}/${k}`, 'aria-current': k === tab ? 'page' : null }, label))),
    cuerpo);
  const paneles = { servicios: tabServicios, profesionales: tabProfesionales, agenda: tabAgenda, suscripcion: tabSuscripcion, ia: tabIA };
  await paneles[tab](cuerpo, id, pago);
}

async function tabServicios(cont, id) {
  const servicios = await api('GET', `/negocios/${id}/servicios`);
  poner(cont,
    servicios.length
      ? tabla(['ID', 'Servicio', 'Duración', 'Precio'], servicios.map((s) => [`#${s.id}`, s.nombre, `${s.duracionMin} min`, fmtPrecio(s.precio)]))
      : vacio('Sin servicios', 'Crea el primero; por ejemplo, “Corte” de 30 minutos.'),
    h('section', { class: 'card' },
      h('h2', {}, 'Nuevo servicio'),
      h('p', { class: 'muted small', style: { marginBottom: '12px' } }, 'La API usa la duración para saber a qué hora termina cada cita y detectar cruces.'),
      formulario({
        cols: 3,
        campos: [
          campo({ name: 'nombre', label: 'Nombre', required: true, minlength: 3, maxlength: 80, placeholder: 'Corte de cabello' }),
          campo({ name: 'duracionMin', label: 'Duración (minutos)', type: 'number', required: true, min: 5, step: 5, value: 30 }),
          campo({ name: 'precio', label: 'Precio', type: 'number', required: true, min: 0.01, step: 0.01, placeholder: '25000' }),
        ],
        enviar: 'Crear servicio',
        onSubmit: async (d) => {
          const s = await api('POST', `/negocios/${id}/servicios`, {
            nombre: d.nombre,
            duracionMin: Number(d.duracionMin),
            precio: Number(d.precio),
          });
          toast(`Servicio “${s.nombre}” creado`);
          render();
        },
      })));
}

async function tabProfesionales(cont, id) {
  const [profs, servicios] = await Promise.all([
    api('GET', `/negocios/${id}/profesionales`),
    api('GET', `/negocios/${id}/servicios`),
  ]);
  const asignados = await Promise.all(profs.map((p) => api('GET', `/profesionales/${p.id}/servicios`)));
  poner(cont,
    profs.length
      ? h('div', { class: 'grid cards' }, profs.map((p, i) => tarjetaProfesional(p, asignados[i], servicios)))
      : vacio('Sin profesionales', 'Agrega a las personas que atienden y luego asígnales los servicios que ofrecen.'),
    h('section', { class: 'card' },
      h('h2', {}, 'Nuevo profesional'),
      formulario({
        cols: 2,
        campos: [
          campo({ name: 'nombre', label: 'Nombre', required: true, minlength: 2, maxlength: 80, placeholder: 'Carlos Ruiz' }),
          campo({ name: 'especialidad', label: 'Especialidad', minlength: 2, maxlength: 80, placeholder: 'Barbero' }),
        ],
        enviar: 'Agregar profesional',
        onSubmit: async (d) => {
          const p = await api('POST', `/negocios/${id}/profesionales`, d);
          toast(`${p.nombre} agregado`);
          render();
        },
      })));
}

function tarjetaProfesional(p, suyos, servicios) {
  const ids = new Set(suyos.map((s) => s.id));
  const libres = servicios.filter((s) => !ids.has(s.id));
  const sel = h('select', { 'aria-label': `Servicio para ${p.nombre}` },
    libres.map((s) => h('option', { value: s.id }, `${s.nombre} · ${s.duracionMin} min`)));

  const accion = (fn, ok) => async () => {
    try {
      await fn();
      toast(ok);
      render();
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  return h('div', { class: 'card' },
    h('div', { class: 'card-top' },
      h('div', {}, h('h3', {}, p.nombre), h('p', { class: 'muted small' }, p.especialidad || 'Sin especialidad')),
      h('span', { class: 'id' }, `#${p.id}`)),
    h('div', { class: 'label-sm' }, 'Servicios que ofrece'),
    suyos.length
      ? h('div', { class: 'chips' }, suyos.map((s) => h('span', { class: 'chip' },
          `${s.nombre} · ${s.duracionMin} min`,
          h('button', {
            type: 'button', class: 'chip-x', title: 'Quitar', 'aria-label': `Quitar ${s.nombre}`,
            onclick: accion(() => api('DELETE', `/profesionales/${p.id}/servicios/${s.id}`), `${s.nombre} retirado de ${p.nombre}`),
          }, '×'))))
      : h('p', { class: 'muted small', style: { margin: '6px 0 12px' } }, 'Todavía no ofrece ningún servicio, así que no se le pueden reservar citas.'),
    libres.length > 0 && h('div', { class: 'inline' },
      sel,
      h('button', {
        type: 'button', class: 'btn',
        onclick: accion(() => api('POST', `/profesionales/${p.id}/servicios`, { servicioId: Number(sel.value) }), `Servicio asignado a ${p.nombre}`),
      }, 'Asignar')),
    servicios.length === 0 && h('p', { class: 'muted small' }, 'Crea servicios en la pestaña “Servicios” para poder asignarlos.'));
}

async function tabAgenda(cont, id) {
  const [citas, profs] = await Promise.all([
    api('GET', `/negocios/${id}/citas`),
    api('GET', `/negocios/${id}/profesionales`),
  ]);
  const hoy = ymd(new Date());
  const proxima = citas.find((c) => ymd(c.fecha) >= hoy);
  let dia = state.agendaDia || (proxima ? ymd(proxima.fecha) : hoy);

  const inputDia = h('input', { type: 'date', value: dia, 'aria-label': 'Día de la agenda', style: { width: 'auto' } });
  const zona = h('div', { class: 'tab-body' });
  const etiquetaDia = h('span', { class: 'muted small' });

  const pintar = () => {
    etiquetaDia.textContent = fmtDia(`${dia}T12:00`);
    const delDia = citas.filter((c) => ymd(c.fecha) === dia);
    llenar(zona,
      profs.length
        ? lineaTiempo(profs, delDia)
        : vacio('Sin profesionales', 'La agenda se organiza por profesional.'),
      h('h2', { class: 'mt' }, `Todas las citas del negocio (${citas.length})`),
      citas.length ? tablaCitas(citas, { cliente: true }) : vacio('Sin citas', 'Cuando alguien reserve aparecerá aquí.'));
  };
  const cambiar = (nuevo) => {
    dia = nuevo;
    state.agendaDia = nuevo;
    inputDia.value = nuevo;
    pintar();
  };
  const mover = (n) => {
    const d = new Date(`${dia}T12:00`);
    d.setDate(d.getDate() + n);
    cambiar(ymd(d));
  };
  inputDia.addEventListener('change', () => cambiar(inputDia.value || hoy));

  poner(cont,
    h('div', { class: 'toolbar' },
      h('button', { class: 'btn', type: 'button', onclick: () => mover(-1), 'aria-label': 'Día anterior' }, '‹'),
      inputDia,
      h('button', { class: 'btn', type: 'button', onclick: () => mover(1), 'aria-label': 'Día siguiente' }, '›'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => cambiar(hoy) }, 'Hoy'),
      etiquetaDia),
    zona);
  pintar();
}

// ─── Suscripción (Stripe) ───

const fmtFechaLarga = (d) => new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

async function tabSuscripcion(cont, id, pago) {
  let sus = await api('GET', `/negocios/${id}/suscripcion`);
  const ruta = `#/negocio/${id}/suscripcion`;
  // Quitamos ?pago=… de la URL sin volver a renderizar (replaceState no dispara hashchange).
  if (pago) history.replaceState(null, '', ruta);

  const aviso = h('div');
  const tarjeta = h('div');

  const pintar = () => {
    const pro = sus.plan === 'PRO';
    llenar(tarjeta, h('section', { class: 'card' },
      h('div', { class: 'card-top' },
        h('div', {},
          h('div', { class: 'label-sm', style: { marginTop: 0 } }, 'Plan actual'),
          h('p', { class: 'plan-grande' }, h('span', { class: `badge plan-${sus.plan.toLowerCase()}` }, sus.plan), ' ', estadoBadge(sus.estado))),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => recargar(true) }, 'Volver a consultar')),
      h('div', { class: 'planes' },
        h('div', { class: `plan ${pro ? '' : 'actual'}` },
          h('h3', {}, 'FREE'),
          h('ul', {}, h('li', {}, 'Servicios y profesionales'), h('li', {}, 'Reservas y agenda'))),
        h('div', { class: `plan ${pro ? 'actual' : ''}` },
          h('h3', {}, 'PRO · USD 9/mes'),
          h('ul', {}, h('li', {}, 'Todo lo de FREE'), h('li', {}, 'Asistente IA: mensajes de confirmación con Gemini')))),
      pro
        ? h('p', { class: 'small muted' },
            sus.vigenteHasta ? `Vigente hasta el ${fmtFechaLarga(sus.vigenteHasta)}.` : 'Plan PRO activo.',
            sus.stripeSubscriptionId && ` Suscripción de Stripe: ${sus.stripeSubscriptionId}`)
        : h('div', { class: 'tab-body' },
            h('div', { class: 'inline' }, h('button', { type: 'button', class: 'btn primary', onclick: pagar }, 'Pasar a PRO con Stripe')),
            h('p', { class: 'small muted' },
              'Te lleva al checkout de Stripe en modo prueba. Usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC. ',
              'El plan cambia cuando llega el webhook: deja corriendo npm run stripe:listen.'))));
  };

  async function recargar(manual) {
    sus = await api('GET', `/negocios/${id}/suscripcion`);
    pintar();
    if (manual) toast(`Plan ${sus.plan}`);
  }

  async function pagar(ev) {
    const boton = ev.currentTarget;
    boton.disabled = true;
    boton.textContent = 'Abriendo Stripe…';
    try {
      const { url } = await api('POST', `/negocios/${id}/suscripcion/checkout`);
      location.href = url;
    } catch (e) {
      toast(e.message, 'err');
      boton.disabled = false;
      boton.textContent = 'Pasar a PRO con Stripe';
    }
  }

  // Al volver de Stripe el pago ya está hecho, pero el plan cambia cuando llega
  // el webhook (unos segundos después): consultamos hasta 30 s.
  async function esperarWebhook() {
    llenar(aviso, h('div', { class: 'callout info' },
      h('strong', {}, 'Pago recibido en Stripe'),
      h('p', {}, 'Esperando a que llegue el webhook y la API active el plan PRO…')));
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      if (!location.hash.startsWith(ruta)) return; // el usuario se fue de la pestaña
      sus = await api('GET', `/negocios/${id}/suscripcion`);
      if (sus.plan === 'PRO') {
        llenar(aviso, h('div', { class: 'callout ok' }, h('strong', {}, '¡Listo! El negocio ya es PRO.')));
        toast('Plan PRO activado');
        pintar();
        return;
      }
    }
    llenar(aviso, h('div', { class: 'callout warn' },
      h('strong', {}, 'El webhook no llegó en 30 segundos'),
      h('p', {}, 'Stripe cobró, pero la API no se enteró. Revisa que npm run stripe:listen esté corriendo y que la API se haya reiniciado con el STRIPE_WEBHOOK_SECRET correcto.')));
  }

  if (pago === 'cancelado') {
    llenar(aviso, h('div', { class: 'callout warn' }, h('strong', {}, 'Pago cancelado'), h('p', {}, 'No se hizo ningún cobro; el negocio sigue en el plan actual.')));
  }
  pintar();
  poner(cont, aviso, tarjeta);
  if (pago === 'ok' && sus.plan !== 'PRO') esperarWebhook();
  else if (pago === 'ok') llenar(aviso, h('div', { class: 'callout ok' }, h('strong', {}, 'El negocio ya es PRO.')));
}

// ─── Asistente IA ───

async function tabIA(cont, id) {
  const [sus, citas] = await Promise.all([
    api('GET', `/negocios/${id}/suscripcion`),
    api('GET', `/negocios/${id}/citas`),
  ]);
  const ahora = new Date();
  const ordenadas = [
    ...citas.filter((c) => new Date(c.fecha) >= ahora),
    ...citas.filter((c) => new Date(c.fecha) < ahora).reverse(),
  ];

  poner(cont,
    h('p', { class: 'muted' }, 'Genera con Gemini un mensaje de WhatsApp para confirmarle la cita al cliente. Si Gemini está saturado o no hay API key, la API usa un mensaje de plantilla.'),
    sus.plan !== 'PRO' && h('div', { class: 'callout warn' },
      h('strong', {}, 'Función exclusiva del plan PRO'),
      h('p', {}, 'Puedes probar el botón igual: la API responderá 402 (Payment Required). ',
        h('a', { href: `#/negocio/${id}/suscripcion` }, 'Pasar a PRO →'))),
    ordenadas.length
      ? h('div', { class: 'ia-lista' }, ordenadas.map((c) => itemIA(id, c)))
      : vacio('Sin citas', 'Reserva una cita para poder generar su mensaje.'));
}

function itemIA(negocioId, c) {
  const salida = h('div');
  const boton = h('button', { type: 'button', class: 'btn' }, 'Generar mensaje');

  boton.addEventListener('click', async () => {
    boton.disabled = true;
    boton.textContent = 'Generando…';
    llenar(salida, h('p', { class: 'muted small' }, 'Consultando a Gemini (puede tardar hasta ~20 s)…'));
    try {
      const r = await api('GET', `/negocios/${negocioId}/citas/${c.id}/mensaje-ia`);
      const copiar = h('button', { type: 'button', class: 'btn ghost sm' }, 'Copiar');
      copiar.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(r.mensaje);
          toast('Mensaje copiado');
        } catch {
          toast('No se pudo copiar: selecciona el texto a mano', 'warn');
        }
      });
      llenar(salida,
        r.aviso && h('div', { class: 'callout warn small' }, r.aviso),
        h('div', { class: 'ia-msg' },
          h('div', { class: 'ia-msg-top' },
            h('span', { class: `badge ${r.modo === 'ia' ? 'modo-ia' : ''}` }, r.modo === 'ia' ? 'Generado por IA' : 'Plantilla'),
            copiar),
          h('p', {}, r.mensaje)));
    } catch (e) {
      llenar(salida, cajaError(e));
    } finally {
      boton.disabled = false;
      boton.textContent = 'Generar otro';
    }
  });

  return h('div', { class: 'card ia-item' },
    h('div', { class: 'card-top' },
      h('div', {},
        h('strong', {}, `${fmtDia(c.fecha)} · ${fmtHora(c.fecha)}–${fmtHora(finDe(c))}`),
        h('p', { class: 'small muted' }, `#${c.id} · ${c.servicio.nombre} con ${c.profesional.nombre} · cliente: ${c.cliente.nombre}`)),
      h('div', { class: 'inline', style: { flexWrap: 'nowrap' } }, estadoBadge(c.estado), boton)),
    salida);
}

// Una columna por profesional; cada cita es un bloque cuya altura es su duración.
function lineaTiempo(profs, citas) {
  let desde = 8 * 60;
  let hasta = 20 * 60;
  for (const c of citas) {
    const a = minDelDia(c.fecha);
    desde = Math.min(desde, Math.floor(a / 60) * 60);
    hasta = Math.max(hasta, Math.ceil((a + c.servicio.duracionMin) / 60) * 60);
  }
  hasta = Math.min(hasta, 24 * 60);
  const PX = 1.2; // píxeles por minuto
  const alto = `${(hasta - desde) * PX}px`;

  const horas = [];
  for (let m = desde; m < hasta; m += 60) horas.push(m);

  return h('div', { class: 'tl-wrap' },
    h('div', { class: 'tl', style: { '--cols': String(profs.length) } },
      h('div', { class: 'tl-rule-col' },
        h('div', { class: 'tl-head' }),
        h('div', { class: 'tl-rule', style: { height: alto } },
          horas.map((m) => h('span', { style: { top: `${(m - desde) * PX}px` } }, minAHora(m))))),
      profs.map((p) => {
        const suyas = citas.filter((c) => c.profesionalId === p.id);
        const activas = suyas.filter((c) => c.estado !== 'CANCELADA').length;
        return h('div', {},
          h('div', { class: 'tl-head', title: p.nombre }, p.nombre, h('span', { class: 'muted small' }, ` · ${activas} cita${activas === 1 ? '' : 's'}`)),
          h('div', { class: 'tl-body', style: { height: alto, '--hora': `${60 * PX}px` } },
            suyas.map((c) => h('div', {
              class: `tl-cita e-${c.estado.toLowerCase()}`,
              style: { top: `${(minDelDia(c.fecha) - desde) * PX}px`, height: `${c.servicio.duracionMin * PX}px` },
              title: `#${c.id} · ${fmtHora(c.fecha)}–${fmtHora(finDe(c))} · ${c.servicio.nombre} · ${c.cliente.nombre} · ${c.estado}`,
            },
              h('strong', {}, `${fmtHora(c.fecha)}–${fmtHora(finDe(c))}`), ' ', c.servicio.nombre,
              h('div', { class: 'small' }, c.cliente.nombre)))));
      })));
}

// ─── Reservar ───

async function vistaReservar(cont, negocioQ) {
  const mios = await api('GET', '/negocios');
  const esMio = negocioQ && mios.some((n) => String(n.id) === negocioQ);

  const sel = h('select', { 'aria-label': 'Negocio' },
    mios.map((n) => h('option', { value: n.id }, `${n.nombre} (#${n.id})`)),
    h('option', { value: 'otro' }, 'Otro negocio (escribir su ID)…'));
  sel.value = esMio ? negocioQ : negocioQ ? 'otro' : mios[0] ? String(mios[0].id) : 'otro';

  const idInput = h('input', { type: 'number', min: 1, placeholder: 'ID del negocio', 'aria-label': 'ID del negocio', value: esMio ? null : negocioQ });
  const btnCargar = h('button', { type: 'button', class: 'btn' }, 'Cargar');
  const zona = h('div');

  const cargar = async () => {
    const nid = sel.value === 'otro' ? Number(idInput.value) : Number(sel.value);
    if (!nid) {
      zona.replaceChildren(vacio('Elige un negocio', 'Selecciona uno de tus negocios o escribe el ID de otro.'));
      return;
    }
    zona.replaceChildren(h('p', { class: 'loading' }, 'Cargando el negocio…'));
    try {
      zona.replaceChildren(await panelReserva(nid));
    } catch (e) {
      zona.replaceChildren(cajaError(e));
    }
  };
  const sincronizar = () => {
    const otro = sel.value === 'otro';
    idInput.hidden = !otro;
    btnCargar.hidden = !otro;
  };
  sel.addEventListener('change', () => { sincronizar(); if (sel.value !== 'otro') cargar(); });
  btnCargar.addEventListener('click', cargar);
  idInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') cargar(); });
  sincronizar();

  poner(cont,
    encabezado('Reservar una cita', `Reservas como ${state.user ? state.user.nombre : 'el usuario con el que entraste'}, que en esta cita actúa como cliente.`),
    h('div', { class: 'card' }, h('div', { class: 'inline' }, sel, idInput, btnCargar)),
    zona);
  await cargar();
}

async function panelReserva(nid) {
  // Hoy la API solo deja listar servicios y profesionales al dueño. Si el
  // negocio no es tuyo (403), caemos al modo manual con IDs.
  try {
    const [servicios, profs, citas] = await Promise.all([
      api('GET', `/negocios/${nid}/servicios`),
      api('GET', `/negocios/${nid}/profesionales`),
      api('GET', `/negocios/${nid}/citas`),
    ]);
    const ofrece = await Promise.all(profs.map((p) => api('GET', `/profesionales/${p.id}/servicios`)));
    return reservaGuiada(nid, {
      servicios,
      profs: profs.map((p, i) => ({ ...p, servicios: ofrece[i].map((s) => s.id) })),
      citas,
    });
  } catch (e) {
    if (e.status === 403) return reservaManual(nid);
    throw e;
  }
}

function citaCreada(c, detalle) {
  return h('div', { class: 'callout ok' },
    h('strong', {}, `Cita #${c.id} creada · ${c.estado}`),
    h('p', {}, detalle),
    h('p', { class: 'small' }, h('a', { href: '#/mis-citas' }, 'Ver mis citas →')));
}

function reservaGuiada(nid, cat) {
  if (!cat.servicios.length) {
    return vacio('Este negocio no tiene servicios', h('a', { href: `#/negocio/${nid}/servicios` }, 'Crear servicios →'));
  }
  const hoy = ymd(new Date());
  const selServicio = h('select', { required: true },
    cat.servicios.map((s) => h('option', { value: s.id }, `${s.nombre} · ${s.duracionMin} min · ${fmtPrecio(s.precio)}`)));
  const selProf = h('select', { required: true });
  const avisoProf = h('p', { class: 'callout warn small', hidden: true },
    'Ningún profesional ofrece este servicio. ',
    h('a', { href: `#/negocio/${nid}/profesionales` }, 'Asígnalo en Profesionales →'));
  const inDia = h('input', { type: 'date', required: true, value: hoy });
  const inHora = h('input', { type: 'time', required: true, step: 300 });
  const notas = h('textarea', { rows: 2, maxlength: 300, placeholder: 'Pidió corte bajo' });
  const resumen = h('p', { class: 'resumen' });
  const error = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const resultado = h('div');
  const boton = h('button', { class: 'btn primary', type: 'submit' }, 'Reservar');
  const disp = h('div', { class: 'card disp' });

  const servicio = () => cat.servicios.find((s) => s.id === Number(selServicio.value));
  const prof = () => cat.profs.find((p) => p.id === Number(selProf.value));
  const etiqueta = (texto, control) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, texto), control);

  function refrescarProfs() {
    const sv = servicio();
    const ofrecen = cat.profs.filter((p) => p.servicios.includes(sv.id));
    const previo = selProf.value;
    selProf.replaceChildren(...ofrecen.map((p) => h('option', { value: p.id }, p.nombre + (p.especialidad ? ` · ${p.especialidad}` : ''))));
    if (ofrecen.some((p) => String(p.id) === previo)) selProf.value = previo;
    selProf.disabled = !ofrecen.length;
    avisoProf.hidden = ofrecen.length > 0;
    refrescarDisp();
  }

  function refrescarDisp() {
    const sv = servicio();
    const p = prof();
    const dia = inDia.value;
    boton.disabled = !sv || !p || !dia;
    if (!sv || !p || !dia) {
      disp.replaceChildren(h('p', { class: 'muted' }, 'Elige servicio, profesional y día para ver su disponibilidad.'));
      resumen.textContent = '';
      resumen.hidden = true;
      return;
    }

    const citasDia = cat.citas
      .filter((c) => c.profesionalId === p.id && ymd(c.fecha) === dia && c.estado !== 'CANCELADA')
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const ocupado = citasDia.map((c) => [minDelDia(c.fecha), minDelDia(c.fecha) + c.servicio.duracionMin]);
    const cruza = (ini, fin) => ocupado.some(([a, b]) => a < fin && ini < b); // misma regla que la API

    const ahora = dia === ymd(new Date()) ? minDelDia(new Date()) : -1;
    const libres = [];
    for (let m = 8 * 60; m + sv.duracionMin <= 20 * 60; m += 15) {
      if (m > ahora && !cruza(m, m + sv.duracionMin)) libres.push(m);
    }

    llenar(disp,
      h('h3', {}, `Agenda de ${p.nombre}`),
      h('p', { class: 'muted small' }, fmtDia(`${dia}T12:00`)),
      h('div', { class: 'label-sm' }, 'Ocupado'),
      citasDia.length
        ? h('ul', { class: 'ocupado' }, citasDia.map((c) => h('li', {},
            h('strong', {}, `${fmtHora(c.fecha)}–${fmtHora(finDe(c))}`), ` ${c.servicio.nombre} · ${c.cliente.nombre}`)))
        : h('p', { class: 'muted small' }, 'No tiene citas ese día.'),
      h('div', { class: 'label-sm' }, `Horas libres para “${sv.nombre}” (${sv.duracionMin} min)`),
      libres.length
        ? h('div', { class: 'slots' }, libres.map((m) => h('button', {
            type: 'button',
            class: `slot ${inHora.value === minAHora(m) ? 'on' : ''}`,
            onclick: () => { inHora.value = minAHora(m); refrescarDisp(); },
          }, minAHora(m))))
        : h('p', { class: 'muted small' }, 'No quedan huecos entre 08:00 y 20:00.'),
      h('p', { class: 'muted small' }, 'Huecos calculados aquí en el navegador (de 08:00 a 20:00, cada 15 min). La validación real la hace la API.'));

    resumen.hidden = false;
    if (inHora.value) {
      const ini = horaAMin(inHora.value);
      const fin = ini + sv.duracionMin;
      llenar(resumen,
        `Ocupará a ${p.nombre} de ${inHora.value} a ${minAHora(fin)} (${sv.duracionMin} min).`,
        cruza(ini, fin) && h('span', { class: 'warn-text' }, ' ⚠ Se cruza con otra cita: la API la rechazará (409).'));
    } else {
      resumen.textContent = 'Elige una hora libre de la derecha o escríbela.';
    }
  }

  selServicio.addEventListener('change', refrescarProfs);
  selProf.addEventListener('change', refrescarDisp);
  inDia.addEventListener('change', refrescarDisp);
  inHora.addEventListener('input', refrescarDisp);

  const form = h('form', { class: 'card form cols-2' },
    h('h2', { style: { gridColumn: '1 / -1', margin: 0 } }, 'Datos de la cita'),
    etiqueta('Servicio', selServicio),
    etiqueta('Profesional', selProf),
    h('div', { style: { gridColumn: '1 / -1' } }, avisoProf),
    etiqueta('Día', inDia),
    etiqueta('Hora (tu hora local)', inHora),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Notas (opcional)'), notas),
    resumen, error,
    h('div', { class: 'form-actions' }, boton),
    h('div', { style: { gridColumn: '1 / -1' } }, resultado));

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    error.hidden = true;
    resultado.replaceChildren();
    const sv = servicio();
    const p = prof();
    const body = { servicioId: sv.id, profesionalId: p.id, fecha: aISO(inDia.value, inHora.value) };
    if (notas.value.trim()) body.notas = notas.value.trim();
    boton.disabled = true;
    try {
      const c = await api('POST', `/negocios/${nid}/citas`, body);
      cat.citas.push({
        ...c,
        servicio: { id: sv.id, nombre: sv.nombre, duracionMin: sv.duracionMin },
        profesional: { id: p.id, nombre: p.nombre },
        cliente: { id: c.clienteId, nombre: state.user ? state.user.nombre : 'Tú' },
      });
      resultado.replaceChildren(citaCreada(c, `${sv.nombre} con ${p.nombre}, ${fmtDia(c.fecha)} de ${fmtHora(c.fecha)} a ${fmtHora(finDe({ ...c, servicio: sv }))}.`));
      toast(`Cita #${c.id} reservada`);
      inHora.value = '';
      notas.value = '';
    } catch (e) {
      error.textContent = e.message;
      error.hidden = false;
    } finally {
      refrescarDisp();
    }
  });

  refrescarProfs();
  return h('div', { class: 'reserva' }, form, disp);
}

function reservaManual(nid) {
  const resultado = h('div');
  return h('div', { class: 'tab-body' },
    h('div', { class: 'callout info' },
      h('strong', {}, `El negocio #${nid} no es tuyo`),
      h('p', {}, 'La API todavía no tiene un catálogo público: solo el dueño puede listar servicios y profesionales. Pídele los IDs al dueño (o entra con su cuenta) y escríbelos aquí.')),
    h('section', { class: 'card' },
      formulario({
        cols: 2,
        campos: [
          campo({ name: 'servicioId', label: 'ID del servicio', type: 'number', required: true, min: 1 }),
          campo({ name: 'profesionalId', label: 'ID del profesional', type: 'number', required: true, min: 1 }),
          campo({ name: 'dia', label: 'Día', type: 'date', required: true, value: ymd(new Date()) }),
          campo({ name: 'hora', label: 'Hora (tu hora local)', type: 'time', required: true, step: 300 }),
          campo({ name: 'notas', label: 'Notas (opcional)', type: 'textarea', rows: 2, maxlength: 300 }),
        ],
        enviar: 'Reservar',
        onSubmit: async (d) => {
          resultado.replaceChildren();
          const body = {
            servicioId: Number(d.servicioId),
            profesionalId: Number(d.profesionalId),
            fecha: aISO(d.dia, d.hora),
          };
          if (d.notas) body.notas = d.notas;
          const c = await api('POST', `/negocios/${nid}/citas`, body);
          resultado.replaceChildren(citaCreada(c, `${fmtDia(c.fecha)} a las ${fmtHora(c.fecha)}.`));
          toast(`Cita #${c.id} reservada`);
        },
      }),
      resultado));
}

// ─── Mis citas ───

async function vistaMisCitas(cont) {
  const citas = await api('GET', '/mis-citas');
  const ahora = new Date();
  const proximas = citas.filter((c) => new Date(c.fecha) >= ahora);
  const pasadas = citas.filter((c) => new Date(c.fecha) < ahora).reverse();
  poner(cont,
    encabezado('Mis citas', 'Las citas que reservaste como cliente, en cualquier negocio.',
      h('a', { class: 'btn primary', href: '#/reservar' }, 'Nueva reserva')),
    h('h2', {}, `Próximas (${proximas.length})`),
    proximas.length ? tablaCitas(proximas, { negocio: true }) : vacio('No tienes citas próximas', 'Reserva una desde “Reservar”.'),
    pasadas.length > 0 && [h('h2', { class: 'mt' }, `Pasadas (${pasadas.length})`), tablaCitas(pasadas, { negocio: true })]);
}

// ─── Perfil ───

async function vistaPerfil(cont) {
  const u = await api('GET', '/perfil');
  state.user = u;
  pintarUsuario();
  const p = u.perfil || {};
  poner(cont,
    encabezado('Mi perfil'),
    h('div', { class: 'card perfil' },
      h('span', { class: 'avatar lg' }, iniciales(u.nombre)),
      h('div', {},
        h('h2', {}, u.nombre),
        h('p', { class: 'muted' }, u.email),
        h('p', { style: { marginTop: '6px' } },
          h('span', { class: `badge rol-${u.rol.toLowerCase()}` }, u.rol), ' ',
          h('span', { class: 'id' }, `usuario #${u.id}`)))),
    h('section', { class: 'card' },
      h('h2', {}, 'Datos del perfil'),
      formulario({
        cols: 2,
        campos: [
          campo({ name: 'telefono', label: 'Teléfono', maxlength: 20, value: p.telefono }),
          campo({ name: 'avatarUrl', label: 'URL del avatar', maxlength: 300, value: p.avatarUrl }),
          campo({ name: 'bio', label: 'Bio', type: 'textarea', rows: 3, maxlength: 300, value: p.bio }),
        ],
        enviar: 'Guardar perfil',
        onSubmit: async (d) => {
          await api('PUT', '/perfil', d);
          toast('Perfil guardado');
          render();
        },
      })));
}

/* ═════════════ Arranque ═════════════ */

function init() {
  const qs = new URLSearchParams(location.search);
  if (qs.get('pago') && /^\d+$/.test(qs.get('negocio') || '')) {
    const pago = qs.get('pago') === 'ok' ? 'ok' : 'cancelado';
    history.replaceState(null, '', `${location.pathname}#/negocio/${qs.get('negocio')}/suscripcion?pago=${pago}`);
  }
  if (state.token && !tokenVigente(state.token)) {
    state.token = null;
    store.set('af_token', null);
  }
  $('#btn-logout').addEventListener('click', () => cerrarSesion());
  $('#btn-log').addEventListener('click', () => mostrarLog($('#log').hidden));
  $('#log-close').addEventListener('click', () => mostrarLog(false));
  $('#log-clear').addEventListener('click', limpiarLog);
  window.addEventListener('hashchange', render);

  const preferencia = store.get('af_log');
  mostrarLog(preferencia ? preferencia === '1' : window.innerWidth > 1100);
  limpiarLog();
  render();
}

document.addEventListener('DOMContentLoaded', init);
