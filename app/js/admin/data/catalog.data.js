// ===================================================
// DATA: CATALOGO DE PRODUCTOS OFICIAL 2026
// ===================================================

const DEFAULT_CATALOG = [
  // Tequeños clásicos
  { id: 'clasicos', name: 'Tequeños de queso (10 unid.)', icon: '🥟', cat: 'Clásicos', qty: '10 unid. · 20 unid. S/ 27.00', price: 16.00, promo: null, sauces: '2 salsas gratis', badge: 'MÁS VENDIDO', desc: 'Queso fundido en masa crocante tradicional.', stock: true },
  { id: 'jamon', name: 'Tequeños de jamón y queso (10 unid.)', icon: '🧀', cat: 'Clásicos', qty: '10 unid. · 20 unid. S/ 28.00', price: 16.00, promo: null, sauces: '2 salsas gratis', badge: '', desc: 'Jamón y queso fundido.', stock: true },
  { id: 'tocino', name: 'Tequeños de tocino y queso (10 unid.)', icon: '🥟', cat: 'Clásicos', qty: '10 unid. · 20 unid. S/ 29.00', price: 17.00, promo: null, sauces: '2 salsas gratis', badge: '', desc: 'Tocino y queso fundido.', stock: true },
  { id: 'hotdog', name: 'Tequeños de hotdog y queso (10 unid.)', icon: '🥟', cat: 'Clásicos', qty: '10 unid. · 20 unid. S/ 28.00', price: 16.00, promo: null, sauces: '2 salsas gratis', badge: '', desc: 'Hotdog y queso fundido.', stock: true },
  { id: 'tresquesos', name: 'Tequeños tres quesos (10 unid.)', icon: '🧀', cat: 'Clásicos', qty: '10 unid. · 20 unid. S/ 28.00', price: 17.00, promo: null, sauces: '2 salsas gratis', badge: '', desc: 'Mezcla de tres quesos fundidos.', stock: true },
  // Tequeños especiales
  { id: 'ajigallina', name: 'Tequeños de ají de gallina (10 unid.)', icon: '🥟', cat: 'Especiales', qty: '10 unid. · 20 unid. S/ 29.00', price: 17.00, promo: null, sauces: '2 salsas gratis', badge: 'RECOMENDADO', desc: 'Relleno de ají de gallina.', stock: true },
  { id: 'dulces', name: 'Tequeños de chocolate (10 unid.)', icon: '🍫', cat: 'Especiales', qty: '10 unid. · 20 unid. S/ 31.00', price: 17.00, promo: null, sauces: '1 salsa incluida', badge: 'NUEVO', desc: 'Relleno de chocolate.', stock: true },
  { id: 'oregano', name: 'Tequeños de queso con masa de orégano (10 unid.)', icon: '🧀', cat: 'Especiales', qty: '10 unid. · 20 unid. S/ 27.00', price: 16.00, promo: null, sauces: '2 salsas gratis', badge: '', desc: 'Queso con masa especial de orégano.', stock: true },
  { id: 'cheddar', name: 'Tequeños de queso cheddar (10 unid.)', icon: '🧀', cat: 'Especiales', qty: '10 unid. · 20 unid. S/ 34.00', price: 18.00, promo: null, sauces: '2 salsas gratis', badge: '', desc: 'Relleno de queso cheddar.', stock: true },
  { id: 'jamoncheddar', name: 'Tequeños de jamón y cheddar (10 unid.)', icon: '🧀', cat: 'Especiales', qty: '10 unid. · 20 unid. S/ 36.00', price: 19.00, promo: null, sauces: '2 salsas gratis', badge: '', desc: 'Jamón y queso cheddar.', stock: true },
  // Promos
  { id: 'combo', name: 'Promo Duo (20 unid. + 2 gaseosas)', icon: '🍱', cat: 'Combos', qty: '20 unid. + 2 gaseosas ½ L', price: 35.90, promo: null, sauces: '2 salsas gratis', badge: 'RECOMENDADO', desc: '20 tequeños (2 sabores) + 2 cremas + 2 gaseosas de ½ L.', stock: true },
  { id: 'promo-solo', name: 'Promo Solo para Mí (10 unid. + 1 gaseosa)', icon: '🍱', cat: 'Combos', qty: '10 unid. + 1 gaseosa ½ L', price: 19.90, promo: null, sauces: '2 salsas gratis', badge: 'PROMO', desc: '10 tequeños de queso + 2 cremas + 1 gaseosa de ½ L.', stock: true },
  { id: 'promo-extra', name: 'Promo Extra (20 unid. + 1 gaseosa)', icon: '🍱', cat: 'Combos', qty: '20 unid. + 1 gaseosa ½ L', price: 32.90, promo: null, sauces: '2 salsas gratis', badge: 'PROMO', desc: '20 tequeños (2 sabores) + 2 cremas + 1 gaseosa de ½ L.', stock: true },
  { id: 'promo-familiar', name: 'Promo Familiar (40 unid. + gaseosa 2 L)', icon: '🍱', cat: 'Combos', qty: '40 unid. + 1 gaseosa 2 L', price: 63.90, promo: null, sauces: '4 cremas incluidas', badge: 'PROMO', desc: '40 tequeños (4 sabores) + 4 cremas + 1 gaseosa de 2 L.', stock: true },
  { id: 'promo-tequepizza', name: 'Promo Tequepizza (pizza + 5 tequeños)', icon: '🍕', cat: 'Combos', qty: '1 pizza familiar + 5 tequeños + gaseosa 1 L', price: 43.90, promo: null, sauces: '1 salsa incluida', badge: 'PROMO', desc: '1 pizza familiar 35 cm + 5 tequeños de queso + 1 crema + 1 gaseosa de 1 L.', stock: true },
  { id: 'promo-antojo', name: 'Promo Antojo Criollo (10 mini empanaditas)', icon: '🥧', cat: 'Combos', qty: '10 mini empanaditas + Coca Cola 600 ml', price: 19.90, promo: null, sauces: '2 salsas gratis', badge: 'PROMO', desc: 'Mini empanaditas de ají de gallina, lomo saltado y queso + 1 Coca Cola 600 ml + 2 cremas.', stock: true },
  { id: 'promo-sazon', name: 'Promo Sazón & Antojo (20 mini tequeños + 20 mini empanaditas)', icon: '🍱', cat: 'Combos', qty: '20 mini tequeños + 20 mini empanaditas + Pepsi 1 L', price: 47.90, promo: null, sauces: '4 cremas incluidas', badge: 'PROMO', desc: 'Mini tequeños de queso + mini empanaditas (ají de gallina, lomo saltado y queso) + 1 Pepsi 1 L + 4 cremas.', stock: true },
  { id: 'promo-bocados', name: 'Promo Bocados de Felicidad (20 mini tequeños + 20 mini empanaditas)', icon: '🍱', cat: 'Combos', qty: '20 mini tequeños + 20 mini empanaditas', price: 36.90, promo: null, sauces: '3 cremas incluidas', badge: 'PROMO', desc: 'Mini tequeños de queso + mini empanaditas (carne, pollo y queso/jamón) + 3 cremas.', stock: true },
  { id: 'promo-fiesta', name: 'Promo Fiesta de Sabor (20 tequeños + 20 mini empanaditas)', icon: '🍱', cat: 'Combos', qty: '20 tequeños + 20 mini empanaditas', price: 43.90, promo: null, sauces: '3 cremas incluidas', badge: 'PROMO', desc: 'Tequeños de queso + mini empanaditas (carne, pollo y queso/jamón) + 3 cremas.', stock: true },
  { id: 'promo-mundo', name: 'Promo Mundo de Sabores (pizza + 20 mini tequeños)', icon: '🍕', cat: 'Combos', qty: '1 pizza familiar + 20 mini tequeños + Pepsi 1 L', price: 51.90, promo: null, sauces: '2 salsas gratis', badge: 'PROMO', desc: '1 pizza familiar (elige sabor) + 20 mini tequeños de queso + 1 Pepsi 1 L + 2 cremas.', stock: true },
  { id: 'promo-sinlimites', name: 'Promo Sabor sin Límites (pizza + 20 mini empanaditas)', icon: '🍕', cat: 'Combos', qty: '1 pizza familiar + 20 mini empanaditas + Pepsi 1 L', price: 54.90, promo: null, sauces: '3 cremas incluidas', badge: 'PROMO', desc: '1 pizza familiar (elige sabor) + 20 mini empanaditas mixtas (carne, pollo, jamón/queso) + 1 Pepsi 1 L + 3 cremas.', stock: true },
  { id: 'promo-tentacion', name: 'Promo La Doble Tentación (pizza hawaiana + 20 tequeños)', icon: '🍕', cat: 'Combos', qty: '1 pizza hawaiana familiar + 20 tequeños', price: 53.90, promo: null, sauces: '2 salsas gratis', badge: 'PROMO', desc: '1 pizza hawaiana familiar + 20 tequeños de jamón/queso + 2 cremas.', stock: true },
  { id: 'promo-placer', name: 'Promo Doble Placer (2 pizzas + Pepsi 1 L)', icon: '🍕', cat: 'Combos', qty: '2 pizzas familiares + Pepsi 1 L', price: 64.90, promo: null, sauces: '2 salsas gratis', badge: 'PROMO', desc: '2 pizzas familiares (elige sabor) + 1 Pepsi 1 L + 2 cremas.', stock: true },
  // Pizzas familiares 35 cm
  { id: 'pizza-americana', name: 'Pizza Americana', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 35.00, promo: null, sauces: 'N/A', badge: '', desc: 'Salsa de tomate, mozarella y jamón.', stock: true },
  { id: 'pizza-italiana', name: 'Pizza Italiana', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 38.00, promo: null, sauces: 'N/A', badge: '', desc: 'Salsa de tomate, mozarella, jamón, aceituna negra, pollo y pimentón.', stock: true },
  { id: 'pizza-supermargarita', name: 'Pizza Super Margarita', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 36.00, promo: null, sauces: 'N/A', badge: '', desc: 'Salsa de tomate, mozarella, jamón, pimentón y aceituna verde.', stock: true },
  { id: 'pizza-hawaiana', name: 'Pizza La Hawaiana', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 37.00, promo: null, sauces: 'N/A', badge: 'MÁS VENDIDO', desc: 'Salsa de tomate, mozarella, jamón y piña.', stock: true },
  { id: 'pizza-peperoni', name: 'Pizza Full Peperoni', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 38.00, promo: null, sauces: 'N/A', badge: '', desc: 'Salsa de tomate, mozarella, peperoni y jamón.', stock: true },
  { id: 'pizza-especial', name: 'Pizza La Especial', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 39.00, promo: null, sauces: 'N/A', badge: 'RECOMENDADO', desc: 'Salsa de tomate, mozarella, pimentón, tocino ahumado, champiñones y queso parmesano.', stock: true },
  { id: 'pizza-espanola', name: 'Pizza Española', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 38.00, promo: null, sauces: 'N/A', badge: '', desc: 'Salsa de tomate, mozarella, chorizo, pimentón y aceituna verde.', stock: true },
  { id: 'pizza-vegetariana', name: 'Pizza Vegetariana', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 36.00, promo: null, sauces: 'N/A', badge: '', desc: 'Salsa de tomate, mozarella, aceituna verde y negra, pimentón y champiñón.', stock: true },
  { id: 'pizza-oriental', name: 'Pizza Oriental', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 37.00, promo: null, sauces: 'N/A', badge: '', desc: 'Salsa de tomate, mozarella, piña y pollo.', stock: true },
  { id: 'pizza-primavera', name: 'Pizza Primavera', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 35.00, promo: null, sauces: 'N/A', badge: '', desc: 'Salsa de tomate, mozarella, jamón y maíz.', stock: true },
  { id: 'pizza-margarita', name: 'Pizza Margarita', icon: '🍕', cat: 'Pizzas', qty: 'Familiar 35 cm', price: 34.00, promo: null, sauces: 'N/A', badge: '', desc: 'Salsa de tomate, mozarella, tomate y aceite de oliva.', stock: true },
  { id: 'pizza-adicional', name: 'Adicional para pizza', icon: '🍕', cat: 'Pizzas', qty: '1 ingrediente', price: 3.00, promo: null, sauces: 'N/A', badge: '', desc: 'Maíz, champiñones, jamón, queso parmesano, tocino o aceituna verde.', stock: true },
  // Pastelitos
  { id: 'pastel-queso', name: 'Pastelito de queso', icon: '🥧', cat: 'Pastelitos', qty: '1 unidad', price: 3.50, promo: null, sauces: 'N/A', badge: '', desc: 'Pastelito relleno de queso.', stock: true },
  { id: 'pastel-jamonqueso', name: 'Pastelito de jamón y queso', icon: '🥧', cat: 'Pastelitos', qty: '1 unidad', price: 4.00, promo: null, sauces: 'N/A', badge: '', desc: 'Pastelito relleno de jamón y queso.', stock: true },
  { id: 'pastel-pizza', name: 'Pastelito de pizza', icon: '🥧', cat: 'Pastelitos', qty: '1 unidad', price: 4.50, promo: null, sauces: 'N/A', badge: '', desc: 'Pastelito relleno sabor pizza.', stock: true },
  { id: 'pastel-pollo', name: 'Pastelito de pollo deshilachado', icon: '🥧', cat: 'Pastelitos', qty: '1 unidad', price: 4.50, promo: null, sauces: 'N/A', badge: '', desc: 'Pastelito relleno de pollo deshilachado.', stock: true },
  { id: 'pastel-carne', name: 'Pastelito de carne deshilachada', icon: '🥧', cat: 'Pastelitos', qty: '1 unidad', price: 4.50, promo: null, sauces: 'N/A', badge: '', desc: 'Pastelito relleno de carne deshilachada.', stock: true },
  // Bebidas
  { id: 'limonada', name: 'Limonada (½ litro)', icon: '🥤', cat: 'Bebidas', qty: '½ litro · 1 litro S/ 15.00', price: 8.00, promo: null, sauces: 'N/A', badge: '', desc: 'Refresco natural de limón.', stock: true },
  { id: 'chicha', name: 'Chicha morada (½ litro)', icon: '🥤', cat: 'Bebidas', qty: '½ litro · 1 litro S/ 15.00', price: 8.00, promo: null, sauces: 'N/A', badge: '', desc: 'Refresco natural de chicha morada.', stock: true },
  { id: 'cocacola', name: 'Coca Cola 600 ml', icon: '🥤', cat: 'Bebidas', qty: '600 ml', price: 5.00, promo: null, sauces: 'N/A', badge: '', desc: 'Gaseosa personal.', stock: true },
  { id: 'inkakola', name: 'Inka Kola 600 ml', icon: '🥤', cat: 'Bebidas', qty: '600 ml', price: 5.00, promo: null, sauces: 'N/A', badge: '', desc: 'Gaseosa personal.', stock: true },
  { id: 'pepsi1l', name: 'Pepsi 1 L', icon: '🥤', cat: 'Bebidas', qty: '1 litro', price: 6.00, promo: null, sauces: 'N/A', badge: '', desc: 'Gaseosa para compartir.', stock: true },
  { id: 'pepsi2l', name: 'Pepsi 2 L', icon: '🥤', cat: 'Bebidas', qty: '2 litros', price: 8.00, promo: null, sauces: 'N/A', badge: '', desc: 'Gaseosa familiar.', stock: true },
  { id: 'agua', name: 'Agua', icon: '🥤', cat: 'Bebidas', qty: 'Botella', price: 4.50, promo: null, sauces: 'N/A', badge: '', desc: 'Agua mineral.', stock: true },
  { id: 'infusiones', name: 'Infusiones', icon: '🥤', cat: 'Bebidas', qty: '1 taza', price: 3.50, promo: null, sauces: 'N/A', badge: '', desc: 'Infusión caliente.', stock: true },
  // Cremas
  { id: 'tartara', name: 'Crema adicional (2 oz)', icon: '🥫', cat: 'Salsas', qty: '2 oz', price: 2.00, promo: null, sauces: 'Porción extra', badge: '', desc: 'Mayonesa de ajo, salsa tocino, mayopalta o ají especial.', stock: true }
];

// Cargar de localStorage si existe, o usar datos por defecto
let savedCatalog = null;
try {
  const item = localStorage.getItem('RTQ_ADMIN_CATALOG');
  if (item) savedCatalog = JSON.parse(item);
} catch (e) {
  console.warn('[Catalog Data] Error al leer localStorage:', e);
}

let CATALOG = (Array.isArray(savedCatalog) && savedCatalog.length > 0) ? savedCatalog : DEFAULT_CATALOG;

function saveCatalogData() {
  try {
    localStorage.setItem('RTQ_ADMIN_CATALOG', JSON.stringify(CATALOG));
  } catch (e) {
    console.error('[Catalog Data] Error al guardar en localStorage:', e);
  }
}

Object.defineProperty(window, 'CATALOG', { get: () => CATALOG, set: value => { CATALOG = Array.isArray(value) ? value : []; } });
window.saveCatalogData = saveCatalogData;
