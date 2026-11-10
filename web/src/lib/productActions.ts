import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useUiStore } from '../store/uiStore';
import type { Product } from '../data/catalog';
import type { Promotion } from '../data/promotions';

export function productUnitPrice(product: Product, presentationId?: string): number {
  const pres =
    product.presentations?.find((p) => p.id === presentationId) ?? product.presentations?.[0];
  return pres ? pres.price : product.basePrice ?? 0;
}

/** Acciones comunes de catálogo: agregar rápido, abrir detalle o configurador. */
export function useProductActions() {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const openConfigurator = useUiStore((s) => s.openConfigurator);
  const showToast = useUiStore((s) => s.showToast);

  const quickAdd = (product: Product, presentationId?: string) => {
    const pres =
      product.presentations?.find((p) => p.id === presentationId) ?? product.presentations?.[0];
    if (!addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity: 1,
      unitPrice: pres ? pres.price : product.basePrice ?? 0,
      selectedPresentation: pres?.label,
      selectedOptions: [],
    })) return;
    showToast({ message: `Agregado: ${product.name}`, action: 'cart' });
  };

  const openProduct = (product: Product) => {
    if (product.category === 'tequenos') {
      navigate(`/producto/${product.slug}`);
      return;
    }
    quickAdd(product);
  };

  const addPromo = (promotion: Promotion) => {
    if (!addItem({
      productId: promotion.id,
      name: promotion.name,
      image: promotion.image,
      quantity: 1,
      unitPrice: promotion.price,
      selectedPresentation: promotion.description,
      selectedOptions: [],
    })) return;
    showToast({ message: `Agregado: ${promotion.name}`, action: 'cart' });
  };

  const openPromo = (promotion: Promotion) => openConfigurator(promotion);

  return { quickAdd, openProduct, addPromo, openPromo };
}
