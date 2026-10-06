// ===================================================
// RETEQUEÑOS - TIPOS DE CARRITO
// ===================================================

export interface CartItem {
  lineId: string;
  productId: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  selectedPresentation?: string;
  selectedOptions?: string[];
  notes?: string;
}
