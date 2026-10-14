const supabaseClient = window.supabase?.createClient(
  window.CLUB_KEBAB_SUPABASE_URL,
  window.CLUB_KEBAB_SUPABASE_KEY
);

const contenido = document.getElementById("productoContenido");
const productoId = new URLSearchParams(window.location.search).get("id");

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

function mostrarProducto(producto) {
  const precio = Number(producto.price).toFixed(2).replace(".", ",");
  const nombre = escapar(producto.name);
  document.title = `${producto.name} | Avenida Kebab`;
  contenido.innerHTML = `
    <div class="producto-cabecera">
      <div>
        <p class="texto-suave">${escapar(producto.category)}</p>
        <h2>${nombre}</h2>
      </div>
      <div class="producto-precio">${precio} €</div>
    </div>
    <div class="producto-info">
      <p>${escapar(producto.description || "Consulta este producto en el restaurante.")}</p>
      <div>
        <h3>Variantes</h3>
        ${lista(producto.variants, "Sin variantes disponibles.")}
      </div>
      <div>
        <h3>Guarniciones</h3>
        ${lista(producto.sides, "Sin guarniciones disponibles.")}
      </div>
      <div class="producto-puntos">
        ${producto.awards_points ? "Este producto suma 1 punto para tu menú gratis." : "Este producto no suma puntos para el menú gratis."}
      </div>
    </div>
  `;
}

async function cargarProducto() {
  if (!supabaseClient || !productoId) {
    contenido.innerHTML = `<div class="producto-error"><h2>Producto no encontrado</h2><p>Vuelve al menú para elegir otro artículo.</p></div>`;
    return;
  }
  const { data, error } = await supabaseClient
    .from("menu_items")
    .select("name, category, price, description, variants, sides, awards_points")
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
