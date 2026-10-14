const MAX_PUNTOS = 10;
const supabaseClient = window.supabase?.createClient(
  window.CLUB_KEBAB_SUPABASE_URL,
  window.CLUB_KEBAB_SUPABASE_KEY
);

const estado = {
  modoAcceso: "login",
  ayudaContrasenaActiva: false,
  sesion: null,
  seccion: "menu",
  clienteSeleccionado: null,
  articuloSeleccionado: null,
  camara: null,
  detector: null,
  escaneando: false,
  modoEscaner: "",
  datos: { clientes: {}, menu: [] }
};

const $ = (id) => document.getElementById(id);

const menuBase = [
  {
    id: "m-pan",
    nombre: "Menú kebab en pan",
    categoria: "Menús con pan",
    precio: 7.5,
    puntos: true,
    descripcion: "Pan tostado con carne, ensalada, salsa, patatas fritas y bebida.",
    variantes: ["Pollo", "Ternera", "Mixto", "Cerdo"],
    guarniciones: ["Patatas fritas", "Ensalada", "Salsa blanca", "Salsa picante"]
  },
  {
    id: "m-durum",
    nombre: "Menú kebab en tortilla",
    categoria: "Menús con tortilla",
    precio: 8,
    puntos: true,
    descripcion: "Tortilla enrollada con carne, verduras frescas, salsa, patatas fritas y bebida.",
    variantes: ["Pollo", "Ternera", "Mixto", "Cerdo"],
    guarniciones: ["Patatas fritas", "Ensalada", "Salsa blanca", "Salsa picante"]
  },
  {
    id: "m-plato",
    nombre: "Plato kebab completo",
    categoria: "Platos",
    precio: 9.5,
    puntos: true,
    descripcion: "Carne al plato con patatas, ensalada, pan y salsa.",
    variantes: ["Pollo", "Ternera", "Mixto"],
    guarniciones: ["Arroz", "Patatas fritas", "Ensalada", "Pan"]
  },
  {
    id: "doner",
    nombre: "Kebab solo en pan",
    categoria: "Kebabs",
    precio: 5,
    puntos: false,
    descripcion: "Kebab en pan sin menú. Ideal para algo rápido.",
    variantes: ["Pollo", "Ternera", "Mixto", "Cerdo"],
    guarniciones: ["Ensalada", "Salsa blanca", "Salsa picante"]
  },
  {
    id: "durum",
    nombre: "Durum solo",
    categoria: "Kebabs",
    precio: 5.8,
    puntos: false,
    descripcion: "Tortilla enrollada sin patatas ni bebida.",
    variantes: ["Pollo", "Ternera", "Mixto", "Cerdo"],
    guarniciones: ["Ensalada", "Salsa blanca", "Salsa picante"]
  },
  {
    id: "falafel",
    nombre: "Menú falafel",
    categoria: "Vegetariano",
    precio: 7.2,
    puntos: true,
    descripcion: "Falafel con ensalada, salsa, patatas fritas y bebida.",
    variantes: ["Falafel clásico", "Falafel picante"],
    guarniciones: ["Patatas fritas", "Ensalada", "Salsa de yogur"]
  },
  {
    id: "patatas",
    nombre: "Patatas fritas",
    categoria: "Complementos",
    precio: 2.5,
    puntos: false,
    descripcion: "Ración de patatas fritas crujientes.",
    variantes: ["Pequeña", "Grande"],
    guarniciones: ["Salsa blanca", "Salsa picante", "Ketchup"]
  },
  {
    id: "bebida",
    nombre: "Bebida",
    categoria: "Bebidas",
    precio: 1.8,
    puntos: false,
    descripcion: "Bebida fría para acompañar.",
    variantes: ["Agua", "Refresco", "Zumo"],
    guarniciones: []
  }
];

function datos() {
  return estado.datos;
}

function guardar(d) {
  estado.datos = d;
}

function articuloDesdeNube(a) {
  return {
    id: a.id,
    nombre: a.name,
    categoria: a.category,
    precio: Number(a.price),
    puntos: Boolean(a.awards_points),
    descripcion: a.description || "",
    variantes: a.variants || [],
    guarniciones: a.sides || []
  };
}

function articuloParaNube(a) {
  return {
    name: a.nombre,
    category: a.categoria,
    price: Number(a.precio),
    description: a.descripcion,
    variants: a.variantes || [],
    sides: a.guarniciones || [],
    awards_points: Boolean(a.puntos),
    active: true
  };
}

function clienteDesdeNube(c) {
  return c ? { id: c.id, correo: c.email, contrasena: "", puntos: c.points } : null;
}

async function cargarMenuNube() {
  const { data, error } = await supabaseClient
    .from("menu_items")
    .select("*")
    .order("name");
  if (error) throw error;
  estado.datos.menu = (data || []).map(articuloDesdeNube);
}

async function cargarClienteNube(id) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, email, role, points")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (data) estado.datos.clientes[data.id] = clienteDesdeNube(data);
  return data;
}

async function guardarArticuloNube(articulo, id) {
  const consulta = id
    ? supabaseClient.from("menu_items").update(articuloParaNube(articulo)).eq("id", id).select().single()
    : supabaseClient.from("menu_items").insert(articuloParaNube(articulo)).select().single();
  const { data, error } = await consulta;
  if (error) throw error;
  return articuloDesdeNube(data);
}

function aviso(texto) {
  $("aviso").textContent = texto;
  $("aviso").classList.add("visible");
  setTimeout(() => $("aviso").classList.remove("visible"), 2800);
}

function actualizarModoAcceso(modo) {
  estado.modoAcceso = modo;
  estado.ayudaContrasenaActiva = false;
  const registro = modo === "registro";
  $("pestanaInicio").classList.toggle("activo", !registro);
  $("pestanaRegistro").classList.toggle("activo", registro);
  $("bloqueTerminos").classList.toggle("oculto", !registro);
  $("botonAcceso").textContent = registro ? "Crear cuenta" : "Iniciar sesión";
  actualizarValidacionAcceso();
}

function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim());
}

function contrasenaValida(contrasena) {
  return contrasena.length >= 6 && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena) && /\d/.test(contrasena);
}

function mensajeErrorAutenticacion(error, registro = false) {
  const codigo = String(error?.code || "").toLowerCase();
  const detalle = String(error?.message || "").toLowerCase();
  const limiteCorreo = codigo.includes("rate_limit") || detalle.includes("rate limit") || detalle.includes("too many requests");
  if (limiteCorreo) return "Has realizado demasiados intentos. Espera unos minutos antes de volver a intentarlo.";
  if (codigo === "email_not_confirmed" || detalle.includes("email not confirmed")) {
    return "Tu correo todavía no está confirmado. Revisa tu bandeja de entrada y pulsa el enlace de verificación.";
  }
  const correoInvalido = codigo === "invalid_email" || detalle.includes("is invalid") || detalle.includes("invalid email") || detalle.includes("unable to validate email");
  if (correoInvalido) return "El correo no tiene un formato válido. Revisa que incluya @ y un dominio como .com.";
  if (registro && (codigo === "user_already_exists" || detalle.includes("already registered") || detalle.includes("already been registered"))) {
    return "Este correo ya está registrado.";
  }
  if (!registro && (codigo === "invalid_credentials" || detalle === "invalid login credentials")) {
    return "Correo no registrado o contraseña incorrecta.";
  }
  return error?.message || (registro ? "No se pudo crear la cuenta." : "No se pudo iniciar sesión.");
}

function actualizarAyudaCorreo(correo, valido) {
  const ayuda = $("ayudaCorreo");
  ayuda.classList.toggle("correcto", valido);
  ayuda.classList.toggle("invalido", Boolean(correo) && !valido);
  if (valido) {
    ayuda.textContent = "Correo válido ✓";
  } else if (!correo) {
    ayuda.textContent = "Escribe tu correo, por ejemplo nombre@dominio.com.";
  } else if (!correo.includes("@")) {
    ayuda.textContent = "Añade @ y el dominio de tu correo.";
  } else {
    const [parteLocal, dominio] = correo.split("@");
    if (!parteLocal) {
      ayuda.textContent = "Escribe el nombre antes de @.";
    } else if (!dominio) {
      ayuda.textContent = "Completa el dominio después de @.";
    } else if (!dominio.includes(".")) {
      ayuda.textContent = "Añade el dominio completo, por ejemplo .com.";
    } else {
      ayuda.textContent = "Revisa el formato del correo.";
    }
  }
}

function actualizarAyudaContrasena(contrasena) {
  $("ayudaContrasena").classList.toggle("activo", estado.ayudaContrasenaActiva || Boolean(contrasena));
  const tieneLongitud = contrasena.length >= 6;
  const tieneLetra = /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena);
  const tieneNumero = /\d/.test(contrasena);
  const requisitosCompletos = tieneLongitud && tieneLetra && tieneNumero;
  $("requisitoLongitud").classList.toggle("cumplido", tieneLongitud);
  $("requisitoLetra").classList.toggle("cumplido", tieneLetra);
  $("conectorNumero").classList.toggle("cumplido", tieneNumero);
  $("requisitoNumero").classList.toggle("cumplido", tieneNumero);
  $("puntoNumero").classList.toggle("cumplido", tieneNumero);
  $("checkContrasena").classList.toggle("visible", requisitosCompletos);
}

function actualizarAyudaNuevaContrasena() {
  const contrasena = $("nuevaContrasena").value;
  const activa = Boolean(contrasena) || document.activeElement === $("nuevaContrasena");
  const tieneLongitud = contrasena.length >= 6;
  const tieneLetra = /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena);
  const tieneNumero = /\d/.test(contrasena);
  const requisitosCompletos = tieneLongitud && tieneLetra && tieneNumero;
  $("ayudaNuevaContrasena").classList.toggle("activo", activa);
  $("nuevaLongitud").classList.toggle("cumplido", tieneLongitud);
  $("nuevaLetra").classList.toggle("cumplido", tieneLetra);
  $("nuevoConectorNumero").classList.toggle("cumplido", tieneNumero);
  $("nuevoNumero").classList.toggle("cumplido", tieneNumero);
  $("nuevoPuntoNumero").classList.toggle("cumplido", tieneNumero);
  $("checkNuevaContrasena").classList.toggle("visible", requisitosCompletos);
  $("nuevaContrasena").classList.toggle("campo-valido", requisitosCompletos);
  $("nuevaContrasena").classList.toggle("campo-invalido", Boolean(contrasena) && !requisitosCompletos);
}

function actualizarValidacionAcceso() {
  const correo = $("correo").value.trim();
  const contrasena = $("contrasena").value;
  const registro = estado.modoAcceso === "registro";
  const emailCorrecto = correoValido(correo);
  const passwordCorrecta = contrasenaValida(contrasena);
  const terminosCorrectos = !registro || $("aceptaTerminos").checked;
  const listo = emailCorrecto && passwordCorrecta && terminosCorrectos;
  actualizarAyudaCorreo(correo, emailCorrecto);
  actualizarAyudaContrasena(contrasena);
  $("correo").classList.toggle("campo-valido", emailCorrecto);
  $("correo").classList.toggle("campo-invalido", Boolean(correo) && !emailCorrecto);
  $("contrasena").classList.toggle("campo-valido", passwordCorrecta);
  $("contrasena").classList.toggle("campo-invalido", Boolean(contrasena) && !passwordCorrecta);
  $("botonAcceso").disabled = !listo;

  const estadoValidacion = $("estadoValidacion");
  estadoValidacion.classList.toggle("correcto", listo);
  estadoValidacion.textContent = listo
    ? (registro ? "Todo listo para crear tu cuenta." : "Todo listo para iniciar sesión.")
    : "";

  return { emailCorrecto, passwordCorrecta, terminosCorrectos, listo };
}

function cliente(id) {
  return datos().clientes[id] || null;
}

function codigoCliente(c) {
  return JSON.stringify({ app: "club-kebab", id: c.id, correo: c.correo });
}

function leerCodigo(texto) {
  const limpio = texto.trim();
  try {
    const d = JSON.parse(limpio);
    if ((d.app === "club-kebab" || d.app === "kebab-club" || d.app === "menu-fidelidad") && d.id && (d.correo || d.email)) {
      return { id: d.id, correo: d.correo || d.email };
    }
  } catch {}
  if (/^(KEB|CLI)-[A-Z0-9]+$/i.test(limpio)) return { id: limpio.toUpperCase(), correo: "cliente-sin-correo@local" };
  return null;
}

function mostrarVista(vista) {
  $("vistaAcceso").classList.toggle("oculto", vista !== "acceso");
  $("vistaApp").classList.toggle("oculto", vista !== "app");
}

function activarSeccion(seccion) {
  estado.seccion = seccion;
  $("seccionMenu").classList.toggle("oculto", seccion !== "menu");
  $("seccionTarjeta").classList.toggle("oculto", seccion !== "tarjeta");
  $("navMenu").classList.toggle("activa", seccion === "menu");
  $("navTarjeta").classList.toggle("activa", seccion === "tarjeta");
  renderizarTarjeta();
}

function renderizarCabecera() {
  const admin = estado.sesion?.rol === "admin";
  $("selloRol").textContent = admin ? "A" : "10";
  $("tituloSesion").textContent = admin ? "Panel del restaurante" : estado.sesion?.correo || "Cliente";
  $("subtituloSesion").textContent = admin ? "Carta, clientes y puntos" : "Menú informativo y tarjeta digital";
  $("nuevoArticulo").classList.toggle("oculto", !admin);
  $("accionesArticulo").classList.toggle("oculto", !admin || !estado.articuloSeleccionado);
}

function categorias(menu) {
  return ["Todas", ...Array.from(new Set(menu.map((a) => a.categoria)))];
}

function renderizarFiltros() {
  const d = datos();
  const select = $("filtroCategoria");
  const actual = select.value || "Todas";
  const cats = categorias(d.menu);
  select.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join("");
  select.value = cats.includes(actual) ? actual : "Todas";
}

function renderizarMenu() {
  const d = datos();
  const q = $("buscarMenu").value.trim().toLowerCase();
  const cat = $("filtroCategoria").value || "Todas";
  const pts = $("filtroPuntos").value;
  const items = d.menu.filter((a) =>
    (cat === "Todas" || a.categoria === cat) &&
    (!q || [a.nombre, a.categoria, a.descripcion, (a.variantes || []).join(" ")].join(" ").toLowerCase().includes(q)) &&
    (pts === "todos" || (pts === "si" ? a.puntos : !a.puntos))
  );

  $("listaMenu").innerHTML = items.map((a) => `
    <a class="articulo-enlace" href="producto.html?id=${encodeURIComponent(a.id)}" aria-label="Ver detalles de ${a.nombre}">
      <article class="articulo" data-id="${a.id}">
      <div class="articulo-cabecera">
        <div><h3>${a.nombre}</h3><p class="texto-suave">${a.categoria}</p></div>
        <div class="precio">${Number(a.precio).toFixed(2)} €</div>
      </div>
      <p>${a.descripcion}</p>
      <div class="etiquetas">
        <span class="etiqueta ${a.puntos ? "puntos" : ""}">${a.puntos ? "Suma puntos" : "No suma puntos"}</span>
        ${(a.variantes || []).slice(0, 3).map((v) => `<span class="etiqueta">${v}</span>`).join("")}
      </div>
      </article>
    </a>
  `).join("") || `<div class="panel texto-suave">No hay artículos con esos filtros.</div>`;

  document.querySelectorAll(".articulo").forEach((el) => {
    el.addEventListener("click", () => seleccionarArticulo(el.dataset.id));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") seleccionarArticulo(el.dataset.id);
    });
  });
  if (!estado.articuloSeleccionado && items[0]) seleccionarArticulo(items[0].id, false);
  renderizarCabecera();
}

function seleccionarArticulo(id, scroll = true) {
  estado.articuloSeleccionado = id;
  const a = datos().menu.find((x) => x.id === id);
  if (!a) return;
  $("detalleNombre").textContent = a.nombre;
  $("detalleDescripcion").textContent = a.descripcion;
  $("detallePrecio").textContent = Number(a.precio).toFixed(2) + " €";
  $("detalleVariantes").textContent = (a.variantes || []).join(", ") || "Sin variantes";
  $("detalleGuarniciones").textContent = (a.guarniciones || []).join(", ") || "Sin guarniciones";
  $("detallePuntos").textContent = a.puntos ? "Sí, suma 1 punto si se compra en el local." : "No suma puntos para el menú gratis.";
  renderizarCabecera();
  if (scroll && innerWidth < 760) $("detalleNombre").scrollIntoView({ behavior: "smooth", block: "start" });
}

function abrirFormularioArticulo(a) {
  $("modalArticulo").classList.remove("oculto");
  $("tituloArticulo").textContent = a ? "Editar artículo" : "Añadir artículo";
  $("articuloId").value = a?.id || "";
  $("articuloNombre").value = a?.nombre || "";
  $("articuloCategoria").value = a?.categoria || "";
  $("articuloPrecio").value = a?.precio || "";
  $("articuloDescripcion").value = a?.descripcion || "";
  $("articuloVariantes").value = (a?.variantes || []).join(", ");
  $("articuloGuarniciones").value = (a?.guarniciones || []).join(", ");
  $("articuloPuntos").checked = Boolean(a?.puntos);
}

function cerrarFormularioArticulo() {
  $("modalArticulo").classList.add("oculto");
  $("formArticulo").reset();
}

async function guardarArticulo(e) {
  e.preventDefault();
  const id = $("articuloId").value;
  const art = {
    id,
    nombre: $("articuloNombre").value.trim(),
    categoria: $("articuloCategoria").value.trim(),
    precio: Number($("articuloPrecio").value),
    descripcion: $("articuloDescripcion").value.trim(),
    variantes: $("articuloVariantes").value.split(",").map((x) => x.trim()).filter(Boolean),
    guarniciones: $("articuloGuarniciones").value.split(",").map((x) => x.trim()).filter(Boolean),
    puntos: $("articuloPuntos").checked
  };
  try {
    const guardado = await guardarArticuloNube(art, id || null);
    const i = datos().menu.findIndex((x) => x.id === guardado.id);
    if (i >= 0) datos().menu[i] = guardado;
    else datos().menu.push(guardado);
    estado.articuloSeleccionado = guardado.id;
    cerrarFormularioArticulo();
    renderizarFiltros();
    renderizarMenu();
    seleccionarArticulo(guardado.id, false);
    aviso("Artículo guardado.");
  } catch (error) {
    aviso(error.message || "No se pudo guardar el artículo.");
  }
}

async function eliminarArticulo() {
  if (!estado.articuloSeleccionado) return;
  const a = datos().menu.find((x) => x.id === estado.articuloSeleccionado);
  if (!a || !confirm(`¿Eliminar "${a.nombre}" del menú?`)) return;
  try {
    const { error } = await supabaseClient.from("menu_items").delete().eq("id", a.id);
    if (error) throw error;
    datos().menu = datos().menu.filter((x) => x.id !== a.id);
    estado.articuloSeleccionado = null;
    $("detalleNombre").textContent = "Selecciona un artículo";
    $("detalleDescripcion").textContent = "Toca un producto para ver ingredientes, variantes y si suma para el menú gratis.";
    $("detallePrecio").textContent = "-";
    $("detalleVariantes").textContent = "-";
    $("detalleGuarniciones").textContent = "-";
    $("detallePuntos").textContent = "-";
    renderizarFiltros();
    renderizarMenu();
    aviso("Artículo eliminado.");
  } catch (error) {
    aviso(error.message || "No se pudo eliminar el artículo.");
  }
}

function renderizarProgreso(contenedor, puntos) {
  contenedor.innerHTML = "";
  for (let i = 0; i < MAX_PUNTOS; i += 1) {
    const m = document.createElement("div");
    m.className = "marca-punto" + (i < puntos ? " llena" : "");
    contenedor.appendChild(m);
  }
}

function renderizarTarjeta() {
  const admin = estado.sesion?.rol === "admin";
  $("tarjetaCliente").classList.toggle("oculto", admin);
  $("tarjetaAdmin").classList.toggle("oculto", !admin);
  if (admin) renderizarClienteAdmin();
  else renderizarCliente();
}

function renderizarCliente() {
  if (!estado.sesion || estado.sesion.rol !== "cliente") return;
  const c = cliente(estado.sesion.id);
  if (!c) {
    salir();
    return;
  }
  $("contadorCliente").textContent = String(c.puntos);
  $("premioCliente").classList.toggle("oculto", c.puntos < MAX_PUNTOS);
  renderizarProgreso($("progresoCliente"), c.puntos);
  const payload = codigoCliente(c);
  $("textoCodigoCliente").textContent = payload;
  $("codigoQr").innerHTML = "";
  try {
    if (typeof QRCode !== "undefined") {
      new QRCode($("codigoQr"), { text: payload, width: 270, height: 270, correctLevel: QRCode.CorrectLevel.M });
    } else {
      $("codigoQr").innerHTML = "<p class='texto-suave'>No se pudo generar el QR. Usa el código manual.</p>";
    }
  } catch {
    $("codigoQr").innerHTML = "<p class='texto-suave'>No se pudo generar el QR. Usa el código manual.</p>";
  }
}

function renderizarClienteAdmin() {
  const c = estado.clienteSeleccionado ? cliente(estado.clienteSeleccionado) : null;
  $("adminVacio").classList.toggle("oculto", Boolean(c));
  $("adminCliente").classList.toggle("oculto", !c);
  if (!c) return;
  $("adminCorreoCliente").textContent = c.correo;
  $("adminIdCliente").textContent = c.id;
  $("adminContadorCliente").textContent = String(c.puntos);
  $("premioAdmin").classList.toggle("oculto", c.puntos < MAX_PUNTOS);
  $("canjear").disabled = c.puntos < MAX_PUNTOS;
  renderizarProgreso($("progresoAdmin"), c.puntos);
}

async function registrar(correo, contrasena) {
  if (!correoValido(correo)) {
    aviso("Escribe un correo válido, por ejemplo nombre@dominio.com.");
    return;
  }
  if (!contrasenaValida(contrasena)) {
    aviso("La contraseña necesita 6 caracteres, una letra y un número.");
    return;
  }
  if (!$("aceptaTerminos").checked) {
    aviso("Debes aceptar los términos y condiciones para crear la cuenta.");
    return;
  }
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: correo,
      password: contrasena,
      options: { emailRedirectTo: `${window.location.origin}/club-kebab/` }
    });
    if (error) throw error;
    if (!data.session) {
      aviso("Cuenta creada. Revisa tu correo para confirmar la cuenta.");
      return;
    }
    await cargarClienteNube(data.user.id);
    estado.sesion = { rol: "cliente", id: data.user.id, correo: data.user.email };
    await entrarApp();
    aviso("Cuenta creada.");
  } catch (error) {
    aviso(mensajeErrorAutenticacion(error, true));
  }
}

async function iniciarSesion(correo, contrasena) {
  if (!correoValido(correo)) {
    aviso("Escribe un correo válido, por ejemplo nombre@dominio.com.");
    return;
  }
  if (!contrasenaValida(contrasena)) {
    aviso("La contraseña necesita 6 caracteres, una letra y un número.");
    return;
  }
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: correo, password: contrasena });
    if (error) throw error;
    localStorage.removeItem("club-kebab-recovery-pending");
    const perfil = await cargarClienteNube(data.user.id);
    estado.sesion = { rol: perfil?.role || "cliente", id: data.user.id, correo: data.user.email };
    await entrarApp();
  } catch (error) {
    aviso(mensajeErrorAutenticacion(error));
  }
}

async function recuperarContrasena() {
  const correo = $("correo").value.trim();
  if (!correoValido(correo)) {
    aviso("Escribe primero el correo de tu cuenta.");
    $("correo").focus();
    return;
  }
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/club-kebab/`
    });
    if (error) throw error;
    localStorage.setItem("club-kebab-recovery-pending", "true");
    aviso("Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.");
  } catch (error) {
    aviso(mensajeErrorAutenticacion(error));
  }
}

async function actualizarContrasena(e) {
  e.preventDefault();
  const nueva = $("nuevaContrasena").value;
  const confirmada = $("confirmarContrasena").value;
  if (!contrasenaValida(nueva)) {
    aviso("La contraseña necesita 6 caracteres, una letra y un número.");
    return;
  }
  if (nueva !== confirmada) {
    aviso("Las contraseñas no coinciden.");
    return;
  }
  try {
    const { error } = await supabaseClient.auth.updateUser({ password: nueva });
    if (error) throw error;
    await supabaseClient.auth.signOut();
    localStorage.removeItem("club-kebab-recovery-pending");
    $("modalRecuperacion").classList.add("oculto");
    $("formularioRecuperacion").reset();
    aviso("Contraseña actualizada. Ya puedes iniciar sesión.");
  } catch (error) {
    aviso(error.message || "No se pudo actualizar la contraseña.");
  }
}

function mostrarModalRecuperacion() {
  $("modalRecuperacion").classList.remove("oculto");
}

async function entrarApp() {
  await cargarMenuNube();
  mostrarVista("app");
  renderizarCabecera();
  renderizarFiltros();
  renderizarMenu();
  activarSeccion("menu");
}

async function salir() {
  cerrarCamara();
  await supabaseClient.auth.signOut();
  estado.sesion = null;
  estado.clienteSeleccionado = null;
  estado.articuloSeleccionado = null;
  $("formularioAcceso").reset();
  actualizarModoAcceso("login");
  mostrarVista("acceso");
}

async function cargarClientePorCodigo(texto) {
  const d = leerCodigo(texto);
  if (!d) {
    aviso("Código no válido.");
    return;
  }
  try {
    const perfil = await cargarClienteNube(d.id);
    if (!perfil) throw new Error("Cliente no encontrado.");
    estado.clienteSeleccionado = d.id;
    renderizarClienteAdmin();
    aviso("Cliente cargado.");
  } catch (error) {
    aviso(error.message || "No se pudo cargar el cliente.");
  }
}

async function sumarPuntosCliente(cantidad) {
  const c = cliente(estado.clienteSeleccionado);
  if (!c) return;
  try {
    const { data, error } = await supabaseClient.rpc("admin_add_points", {
      target_customer: c.id,
      points_to_add: cantidad,
      operation_note: "Compra registrada desde Avenida Kebab"
    });
    if (error) throw error;
    datos().clientes[c.id] = clienteDesdeNube(data);
    renderizarClienteAdmin();
    aviso("Puntos actualizados.");
  } catch (error) {
    aviso(error.message || "No se pudieron sumar los puntos.");
  }
}

async function canjearPuntosCliente() {
  const c = cliente(estado.clienteSeleccionado);
  if (!c || c.puntos < MAX_PUNTOS) return;
  try {
    const { data, error } = await supabaseClient.rpc("admin_redeem_points", {
      target_customer: c.id,
      operation_note: "Premio canjeado desde Avenida Kebab"
    });
    if (error) throw error;
    datos().clientes[c.id] = clienteDesdeNube(data);
    renderizarClienteAdmin();
    aviso("Menú gratis canjeado. Cuenta en 0.");
  } catch (error) {
    aviso(error.message || "No se pudo canjear el premio.");
  }
}

async function abrirCamara() {
  try {
    estado.camara = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = $("camara");
    video.srcObject = estado.camara;
    video.classList.remove("oculto");
    $("marcoCamara").classList.add("activo");
    await video.play();
    estado.escaneando = true;
    $("abrirCamara").disabled = true;
    $("cerrarCamara").disabled = false;
    if ("BarcodeDetector" in window) {
      estado.detector = new BarcodeDetector({ formats: ["qr_code"] });
      estado.modoEscaner = "nativo";
      $("ayudaEscaner").textContent = "Cámara activa. Apunta al QR del cliente.";
    } else if (typeof jsQR !== "undefined") {
      estado.detector = null;
      estado.modoEscaner = "alternativo";
      $("ayudaEscaner").textContent = "Cámara activa. Mantén el QR dentro del recuadro.";
    } else {
      aviso("El lector QR no cargó. Usa el código manual.");
      cerrarCamara();
      return;
    }
    bucleEscaner();
  } catch {
    aviso("No pude abrir la cámara. Revisa permisos o usa el código manual.");
  }
}

async function bucleEscaner() {
  if (!estado.escaneando) return;
  const video = $("camara");
  try {
    if (estado.modoEscaner === "nativo" && estado.detector) {
      const codigos = await estado.detector.detect(video);
      if (codigos.length) {
        cargarClientePorCodigo(codigos[0].rawValue);
        cerrarCamara();
        return;
      }
    } else if (estado.modoEscaner === "alternativo" && typeof jsQR !== "undefined" && video.readyState >= 2) {
      const canvas = $("lienzoEscaner");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
      if (code && code.data) {
        cargarClientePorCodigo(code.data);
        cerrarCamara();
        return;
      }
    }
  } catch {}
  requestAnimationFrame(bucleEscaner);
}

function cerrarCamara() {
  estado.escaneando = false;
  if (estado.camara) estado.camara.getTracks().forEach((t) => t.stop());
  estado.camara = null;
  estado.detector = null;
  estado.modoEscaner = "";
  const video = $("camara");
  if (video) {
    video.pause();
    video.srcObject = null;
    video.classList.add("oculto");
  }
  $("marcoCamara").classList.remove("activo");
  $("abrirCamara").disabled = false;
  $("cerrarCamara").disabled = true;
}

$("pestanaInicio").onclick = () => actualizarModoAcceso("login");
$("pestanaRegistro").onclick = () => actualizarModoAcceso("registro");
$("correo").oninput = actualizarValidacionAcceso;
$("contrasena").onfocus = () => {
  estado.ayudaContrasenaActiva = true;
  actualizarValidacionAcceso();
};
$("contrasena").onblur = () => {
  if (!$('contrasena').value) estado.ayudaContrasenaActiva = false;
  actualizarValidacionAcceso();
};
$("contrasena").oninput = () => {
  estado.ayudaContrasenaActiva = true;
  actualizarValidacionAcceso();
};
$("aceptaTerminos").onchange = actualizarValidacionAcceso;
$("botonRecuperar").onclick = recuperarContrasena;
$("formularioRecuperacion").onsubmit = actualizarContrasena;
$("nuevaContrasena").onfocus = actualizarAyudaNuevaContrasena;
$("nuevaContrasena").oninput = actualizarAyudaNuevaContrasena;
$("nuevaContrasena").onblur = actualizarAyudaNuevaContrasena;
$("formularioAcceso").onsubmit = (e) => {
  e.preventDefault();
  const correo = $("correo").value.trim();
  const contrasena = $("contrasena").value;
  if (estado.modoAcceso === "registro") registrar(correo, contrasena);
  else iniciarSesion(correo, contrasena);
};
actualizarValidacionAcceso();

$("verTerminos").onclick = () => $("modalTerminos").classList.remove("oculto");
$("cerrarTerminos").onclick = () => $("modalTerminos").classList.add("oculto");
$("botonSalir").onclick = salir;
$("navMenu").onclick = () => activarSeccion("menu");
$("navTarjeta").onclick = () => activarSeccion("tarjeta");
$("buscarMenu").oninput = renderizarMenu;
$("filtroCategoria").onchange = renderizarMenu;
$("filtroPuntos").onchange = renderizarMenu;
$("nuevoArticulo").onclick = () => abrirFormularioArticulo(null);
$("editarArticulo").onclick = () => abrirFormularioArticulo(datos().menu.find((a) => a.id === estado.articuloSeleccionado));
$("eliminarArticulo").onclick = eliminarArticulo;
$("formArticulo").onsubmit = guardarArticulo;
$("cancelarArticulo").onclick = cerrarFormularioArticulo;
$("abrirCamara").onclick = abrirCamara;
$("cerrarCamara").onclick = cerrarCamara;
$("buscarCliente").onclick = () => cargarClientePorCodigo($("codigoManual").value);
$("sumarUno").onclick = () => sumarPuntosCliente(1);
$("sumarVarios").onclick = () => {
  const n = Number(prompt("¿Cuántos menús compró?", "2"));
  if (!Number.isFinite(n) || n <= 0) return;
  sumarPuntosCliente(Math.floor(n));
};
$("canjear").onclick = canjearPuntosCliente;
$("quitarCliente").onclick = () => {
  estado.clienteSeleccionado = null;
  renderizarClienteAdmin();
};

async function inicializarAplicacion() {
  mostrarVista("acceso");
  renderizarFiltros();
  renderizarMenu();
  if (!supabaseClient) {
    aviso("No se pudo cargar la conexión con Supabase.");
    return;
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js?v=21").catch(() => {});
  supabaseClient.auth.onAuthStateChange((evento) => {
    if (evento === "PASSWORD_RECOVERY") mostrarModalRecuperacion();
  });
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) return;
  const hashEsRecuperacion = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
  const consultaEsRecuperacion = new URLSearchParams(window.location.search).get("type") === "recovery";
  const recuperacionPendiente = localStorage.getItem("club-kebab-recovery-pending") === "true";
  if (hashEsRecuperacion || consultaEsRecuperacion || recuperacionPendiente) {
    mostrarModalRecuperacion();
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return;
  }
  try {
    const perfil = await cargarClienteNube(data.session.user.id);
    estado.sesion = {
      rol: perfil?.role || "cliente",
      id: data.session.user.id,
      correo: data.session.user.email
    };
    await entrarApp();
  } catch (error) {
    await supabaseClient.auth.signOut();
    aviso(error.message || "No se pudo restaurar la sesión.");
  }
}

inicializarAplicacion();
