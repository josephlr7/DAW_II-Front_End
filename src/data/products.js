/**
 * NEXUS TECH Store Perú - Configuración de Catálogo
 * Toda la data de productos se consume 100% en tiempo real desde MySQL (Product-Service:8096)
 */

export const CATEGORIES = [
  { id: 'all', label: 'Todo el Catálogo' },
  { id: 'laptops', label: 'Laptops Gamer & Pro' },
  { id: 'monitores', label: 'Monitores & Displays' },
  { id: 'componentes', label: 'Tarjetas de Video & CPUs' },
  { id: 'perifericos', label: 'Teclados & Mouse' },
  { id: 'audio', label: 'Audio & Streaming' }
];

// Data semilla eliminada: Los productos se cargan exclusivamente desde la base de datos MySQL
export const PRODUCTS = [];
