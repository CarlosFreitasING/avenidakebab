const supabaseClient = window.supabase?.createClient(
  window.CLUB_KEBAB_SUPABASE_URL,
  window.CLUB_KEBAB_SUPABASE_KEY
);

const contenido = document.getElementById("productoContenido");
const productoId = new URLSearchParams(window.location.search).get("id");
const volverMenu = document.getElementById("volverMenu");

if (volverMenu && document.referrer.startsWith(window.location.origin)) {
  volverMenu.addEventListener("click", (evento) => {
    evento.preventDefault();
    window.history.back();
  });
}

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>\"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[caracter]);
}

function lista(items, vacio) {
  const valores = Array.isArray(items) ? items.filter(Boolean) : [];
  return valores.length
    ? `<ul class="producto-lista">${valores.map((item) => `<li>${escapar(item)}</li>`).join("")}</ul>`
    : `<p class="texto-suave">${vacio}</p>`;
}

function imagenesSeguras(items) {
  return (Array.isArray(items) ? items : []).filter((item) => /^(https?:\/\/|\.\/|\/)/i.test(item));
}

function mapaImagenesSeguro(mapa) {
  return Object.fromEntries(Object.entries(mapa || {}).filter(([nombre, url]) => nombre && /^(https?:\/\/|\.\/|\/)/i.test(url)));
}

function etiquetasVariantes(variantes) {
  const valores = Array.isArray(variantes) ? variantes.filter(Boolean) : [];
  return valores.length
    ? `<div class="producto-etiquetas">${valores.map((item, indice) => `<button class="producto-variante${indice === 0 ? " activa" : ""}" type="button" data-variante="${escapar(item)}">${escapar(item)}</button>`).join("")}</div>`
    : "";
}

function etiquetasGuarniciones(items) {
  const valores = Array.isArray(items) ? items.filter(Boolean) : [];
  return valores.length
    ? `<div class="producto-etiquetas producto-guarniciones">${valores.map((item) => `<span><b aria-hidden="true">${iconoGuarnicion(item)}</b>${escapar(item)}</span>`).join("")}</div>`
    : "";
}

function claveAlergeno(valor) {
  return String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-");
}

function alergenosDestacados(producto) {
  const confirmados = new Set((producto.allergens || []).map(claveAlergeno));
  const catalogo = [
    ["gluten", "assets/alergenos/gluten.png", "Gluten"],
    ["leche", "assets/alergenos/leche.png", "Leche"],
    ["huevo", "assets/alergenos/huevo.png", "Huevo"],
    ["mostaza", "assets/alergenos/mostaza.png", "Mostaza"],
    ["sesamo", "assets/alergenos/sesamo.png", "Sésamo"],
    ["soja", "assets/alergenos/soja.png", "Soja"],
    ["pescado", "assets/alergenos/pescado.png", "Pescado"],
    ["crustaceos", "assets/alergenos/crustaceos.png", "Crustáceos"],
    ["cacahuete", "assets/alergenos/cacahuete.png", "Cacahuete"],
    ["frutos-secos", "assets/alergenos/frutos-secos.png", "Frutos secos"],
    ["apio", "assets/alergenos/apio.png", "Apio"],
    ["moluscos", "assets/alergenos/moluscos.png", "Moluscos"],
    ["altramuces", "assets/alergenos/altramuces.png", "Altramuces"],
    ["sulfitos", "assets/alergenos/sulfitos.png", "Sulfitos"]
  ];
  const preferidos = new Set(["gluten", "leche", "huevo", "mostaza", "sesamo", "soja"]);
  const declarados = catalogo.filter(([clave]) => confirmados.has(clave));
  const relleno = catalogo.filter(([clave]) => !confirmados.has(clave) && preferidos.has(clave));
  const secundarios = catalogo.filter(([clave]) => !confirmados.has(clave) && !preferidos.has(clave));
  const ordenados = declarados.length >= 6
    ? declarados
    : [...declarados, ...relleno, ...secundarios].slice(0, 6);
  return `<div class="alergenos-destacados" aria-label="Resumen de alérgenos destacados">${ordenados.map(([clave, icono, nombre]) => {
    const estado = confirmados.has(clave) ? "presente" : "no-declarado";
    const texto = estado === "presente" ? `Contiene ${nombre}` : `${nombre}: no declarado`;
    return `<span class="alergeno-icono ${estado}" title="${texto}" aria-label="${texto}"><img src="${icono}" alt="" loading="lazy"><small>${nombre}</small></span>`;
  }).join("")}</div>`;
}

function etiquetasDieteticas(items) {
  const iconos = {
    vegetariano: ["assets/alergenos/vegetarian.png", "Vegetariano"],
    vegano: ["assets/dietas/vegano.svg", "Vegano"]
  };
  const valores = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!valores.length) return "";
  return `<div class="dietas-destacadas">${valores.map((item) => {
    const clave = claveAlergeno(item);
    const [icono, nombre] = iconos[clave] || ["", String(item)];
    return icono
      ? `<span class="dieta-icono" title="${escapar(nombre)}"><img src="${icono}" alt=""><small>${escapar(nombre)}</small></span>`
      : `<span class="dieta-icono" title="${escapar(nombre)}"><b class="dieta-icono-generico" aria-hidden="true">✓</b><small>${escapar(nombre)}</small></span>`;
  }).join("")}</div>`;
}

function informacionAlimentaria(producto) {
  const bloques = [];
  const agregarLista = (titulo, items) => {
    const valores = Array.isArray(items) ? items.filter(Boolean) : [];
    if (valores.length) bloques.push(`<div><h4>${titulo}</h4>${lista(valores, "")}</div>`);
  };
  agregarLista("Ingredientes", producto.ingredients);
  agregarLista("Puede contener", producto.may_contain);
  const dietas = etiquetasDieteticas(producto.dietary_tags);
  if (dietas) bloques.push(`<div class="bloque-dietas"><h4>Etiquetas</h4>${dietas}</div>`);
  return bloques.length
    ? `<div class="producto-seccion"><h3>Alérgenos</h3>${alergenosDestacados(producto)}${bloques.join("")}</div>`
    : "";
}

function iconoGuarnicion(item) {
  const nombre = String(item).toLowerCase();
  if (nombre.includes("couve roxa") || nombre.includes("col morada")) return "🥗";
  if (nombre.includes("alface") || nombre.includes("lechuga")) return "🥬";
  if (nombre.includes("cenoura") || nombre.includes("zanahoria")) return "🥕";
  if (nombre.includes("tomate")) return "🍅";
  if (nombre.includes("milho") || nombre.includes("maíz")) return "🌽";
  if (nombre.includes("pepino")) return "🥒";
  if (nombre.includes("cebola") || nombre.includes("cebolla")) return "🧅";
  if (nombre.includes("pimento") || nombre.includes("pimiento")) return "🫑";
  if (nombre.includes("cogumelo") || nombre.includes("champiñon")) return "🍄";
  if (nombre.includes("azeitona") || nombre.includes("aceituna")) return "🫒";
  if (nombre.includes("ananás") || nombre.includes("piña")) return "🍍";
  if (nombre.includes("queijo") || nombre.includes("queso")) return "🧀";
  if (nombre.includes("ensalada") || nombre.includes("salada")) return "🥗";
  if (nombre.includes("salsa picante")) return "🌶️";
  if (nombre.includes("salsa blanca") || nombre.includes("yogur")) return "🥣";
  if (nombre.includes("arroz")) return "🍚";
  if (nombre.includes("patata") || nombre.includes("papa") || nombre.includes("batata")) return "🍟";
  if (nombre.includes("manteiga") || nombre.includes("mantequilla")) return "🧈";
  if (nombre.includes("pan")) return "🥖";
  if (nombre.includes("ketchup")) return "🍅";
  return "🍽️";
}

function mostrarProducto(producto) {
  const precio = Number(producto.price).toFixed(2).replace(".", ",");
  const nombre = escapar(producto.name);
  const imagenes = imagenesSeguras(producto.image_urls);
  const imagenesVariantes = mapaImagenesSeguro(producto.variant_images);
  const variantes = etiquetasVariantes(producto.variants);
  const guarniciones = etiquetasGuarniciones(producto.sides);
  document.title = `${producto.name} | Avenida Kebab`;
  contenido.innerHTML = `
    <div class="producto-galeria">
      <div id="imagenPrincipal" class="producto-imagen producto-imagen-principal">${imagenes.length ? `<img src="${escapar(imagenes[0])}" alt="${nombre}">` : "Imagen del producto pendiente"}</div>
      ${imagenes.slice(1).map((imagen, indice) => `<div class="producto-imagen"><img src="${escapar(imagen)}" alt="${nombre}, imagen ${indice + 2}"></div>`).join("")}
    </div>
    <div class="producto-cabecera">
      <div>
        <p class="texto-suave">${escapar(producto.category)}</p>
        <h2>${nombre}</h2>
      </div>
      <div class="producto-precio">${precio} €</div>
    </div>
    <div class="producto-info">
      <p>${escapar(producto.description || "Consulta este producto en el restaurante.")}</p>
      ${variantes ? `<div class="producto-seccion"><h3>Variantes</h3><p class="producto-ayuda">Selecciona una variante para ver su imagen.</p>${variantes}</div>` : ""}
      ${guarniciones ? `<div class="producto-seccion"><h3>Guarniciones</h3>${guarniciones}</div>` : ""}
      ${informacionAlimentaria(producto)}
      <div class="producto-puntos">
        ${producto.awards_points ? "<strong>+1 punto</strong><span>Este producto suma para tu menú gratis.</span>" : "<span>Este producto no suma puntos para el menú gratis.</span>"}
      </div>
    </div>
  `;
  document.querySelectorAll(".producto-variante").forEach((boton) => {
    boton.addEventListener("click", () => {
      const variante = boton.dataset.variante;
      const imagen = imagenesVariantes[variante] || imagenes[0];
      const principal = document.getElementById("imagenPrincipal");
      principal.innerHTML = imagen
        ? `<img src="${escapar(imagen)}" alt="${nombre}, variante ${escapar(variante)}">`
        : `Imagen de ${escapar(variante)} pendiente`;
      document.querySelectorAll(".producto-variante").forEach((elemento) => elemento.classList.toggle("activa", elemento === boton));
    });
  });
}

async function cargarProducto() {
  if (!supabaseClient || !productoId) {
    contenido.innerHTML = `<div class="producto-error"><h2>Producto no encontrado</h2><p>Vuelve al menú para elegir otro artículo.</p></div>`;
    return;
  }
  const { data, error } = await supabaseClient
    .from("menu_items")
    .select("*")
    .eq("id", productoId)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) {
    contenido.innerHTML = `<div class="producto-error"><h2>Producto no encontrado</h2><p>Este artículo ya no está disponible.</p></div>`;
    return;
  }
  mostrarProducto(data);
}

cargarProducto();
