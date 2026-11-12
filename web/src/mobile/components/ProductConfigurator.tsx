import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Product } from '../../types/product';
import { PROMOTIONS } from '../../data/promotions';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { ProductConfiguratorModal } from '../../components/configurator/ProductConfiguratorModal';
import { ProductOptionsForm } from './ProductOptionsForm';

/**
 * Selección rápida desde el menú. Las promos usan el configurador de sabores, cremas,
 * bebida y notas (RFI-04); el resto, tamaño, extras, cantidad y notas (RFI-03).
 */
interface ProductConfiguratorProps {
  product: Product;
  onClose: () => void;
}

export const ProductConfigurator: React.FC<ProductConfiguratorProps> = ({ product, onClose }) => {
  const promo = PROMOTIONS.find((p) => p.id === product.id);

  useEffect(() => {
    if (promo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [promo, onClose]);

  if (promo) return <ProductConfiguratorModal isOpen onClose={onClose} productOrPromo={promo} hideBuyNow onOpenCartDrawer={onClose} />;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="bg-[#FFF8EE] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <ImageWithFallback src={product.image} alt={product.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-sm text-[#242424] leading-tight">{product.name}</h2>
            {product.description && <p className="text-[11px] text-[#4B4540] line-clamp-2">{product.description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <ProductOptionsForm product={product} layout="modal" onAdded={onClose} />
      </div>
    </div>,
    document.body
  );
};
