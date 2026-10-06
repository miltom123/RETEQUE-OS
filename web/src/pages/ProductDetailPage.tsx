import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, MessageCircle, Check } from 'lucide-react';
import { PRODUCTS, CREMAS_EXTRAS } from '../data/catalog';
import { useCartStore } from '../store/cartStore';
import { useUiStore } from '../store/uiStore';
import { formatMoney } from '../lib/money';
import { openWhatsApp } from '../lib/whatsapp';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { NotFoundPage } from './NotFoundPage';
import { siteConfig } from '../config/site';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const product = PRODUCTS.find((p) => p.slug === slug);

  if (!product) {
    return <NotFoundPage />;
  }

  return <ProductDetail key={product.id} product={product} />;
};

type ProductType = (typeof PRODUCTS)[number];

const ProductDetail: React.FC<{ product: ProductType }> = ({ product }) => {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const showToast = useUiStore((s) => s.showToast);

  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [selectedPresentationId, setSelectedPresentationId] = useState<string>(
    product.presentations ? product.presentations[0].id : ''
  );
  const [selectedCremas, setSelectedCremas] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  const selectedPres = product.presentations?.find((p) => p.id === selectedPresentationId);
  const baseUnitPrice = selectedPres ? selectedPres.price : product.basePrice || 0;
  const cremasPrice = selectedCremas.length * 2.0;
  const unitPrice = baseUnitPrice + cremasPrice;
  const totalPrice = unitPrice * quantity;

  const cremaLabels = selectedCremas.map((cId) => CREMAS_EXTRAS.find((c) => c.id === cId)?.label || cId);

  const toggleCrema = (id: string) => {
    setSelectedCremas((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity,
      unitPrice,
      selectedPresentation: selectedPres ? selectedPres.label : undefined,
      selectedOptions: cremaLabels.map((c) => `Crema extra: ${c}`),
      notes: notes.trim() || undefined,
    });
    setAddedToast(true);
    showToast({ message: `Agregado: ${quantity} × ${product.name}`, action: 'cart' });
    setTimeout(() => setAddedToast(false), 1500);
  };

  const handleBuyWhatsApp = () => {
    const presText = selectedPres ? ` (${selectedPres.label})` : '';

    const lines = [
      '🥟 *PEDIDO RETEQUEÑOS* 👋',
      '',
      'Quiero realizar la siguiente consulta / pedido rápido:',
      '',
      `📦 *${quantity} x ${product.name}*${presText} — ${formatMoney(totalPrice)}`,
    ];
    if (cremaLabels.length > 0) lines.push(`   • Cremas extra: ${cremaLabels.join(', ')}`);
    if (notes.trim()) lines.push(`   • Indicaciones: ${notes.trim()}`);
    lines.push('');
    lines.push(`💰 *TOTAL:* ${formatMoney(totalPrice)}`);
    lines.push('🛵 *ENTREGA:* Delivery / Recojo a coordinar');
    lines.push('');
    lines.push('Deseo coordinar la entrega y forma de pago. ¡Muchas gracias!');
    openWhatsApp(lines.join('\n'));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <nav className="text-xs text-neutral-400 flex items-center gap-1.5" aria-label="Ruta">
        <Link to="/" className="hover:text-neutral-700 transition-colors">
          Inicio
        </Link>
        <span aria-hidden="true">&gt;</span>
        <Link to="/tequenos" className="hover:text-neutral-700 transition-colors">
          Tequeños
        </Link>
        <span aria-hidden="true">&gt;</span>
        <span className="text-neutral-700 font-semibold">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Galería */}
        <div className="lg:col-span-6 space-y-3">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-neutral-200 bg-neutral-100">
            <ImageWithFallback
              src={gallery[activeImageIndex]}
              alt={product.name}
              fallbackLabel={product.name}
              className="w-full h-full object-cover"
              decoding="async"
            />
            <div className="absolute top-4 left-4 font-script text-white text-2xl sm:text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none">
              El antojo también une ♡
            </div>
          </div>

          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-2.5" role="group" aria-label="Más fotos">
              {gallery.slice(0, 4).map((thumb, idx) => {
                const isSelected = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    aria-label={`Ver foto ${idx + 1}`}
                    aria-pressed={isSelected}
                    className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-brand-red ring-2 ring-brand-red/20 shadow-sm'
                        : 'border-neutral-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <ImageWithFallback src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Opciones */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">{product.name}</h1>
            <p className="font-script text-lg sm:text-xl text-neutral-600 mt-1">
              {product.description || 'Con el sabor y la receta original de siempre ♡'}
            </p>
          </div>

          {product.presentations && product.presentations.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900">Elige tu presentación</span>
                <span className="text-[11px] font-bold text-brand-red bg-[#FFEAEB] px-2 py-0.5 rounded-full">Requerido</span>
              </div>

              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Presentación">
                {product.presentations.map((pres) => {
                  const isSelected = pres.id === selectedPresentationId;
                  return (
                    <button
                      key={pres.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedPresentationId(pres.id)}
                      className={`p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left ${
                        isSelected ? 'border-brand-red bg-white shadow-sm' : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-brand-red' : 'border-neutral-300'
                        }`}
                      >
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-brand-red" />}
                      </span>
                      <span>
                        <span className="block text-xs font-bold text-neutral-900">{pres.label}</span>
                        <span className="block text-sm font-extrabold text-neutral-900 mt-0.5">{formatMoney(pres.price)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900">Agrega tus cremas</span>
                <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">Opcional</span>
              </div>
              <span className="text-xs text-neutral-500 font-medium">
                Cremas adicionales de 2 oz — <span className="font-bold text-neutral-800">S/ 2.00 c/u</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CREMAS_EXTRAS.map((crema) => {
                const isSelected = selectedCremas.includes(crema.id);
                return (
                  <button
                    key={crema.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleCrema(crema.id)}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col items-center text-center gap-2 ${
                      isSelected ? 'border-brand-red bg-brand-red-light/30 shadow-sm' : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <span className="flex items-center justify-between w-full">
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-brand-red border-brand-red text-white' : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </span>
                    <ImageWithFallback
                      src={`/assets/products/cremas/${crema.id}.jpg`}
                      alt=""
                      className="w-10 h-8 object-contain"
                      loading="lazy"
                    />
                    <span className="text-xs font-bold text-neutral-800 leading-tight">{crema.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="detalle-notas" className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900">Indicaciones para tu pedido</span>
                <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">Opcional</span>
              </label>
              <span className="text-xs text-neutral-400">{notes.length}/200</span>
            </div>

            <textarea
              id="detalle-notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 200))}
              placeholder="Ej. Sin sal, extra crocante, salsas separadas, etc."
              rows={2}
              className="w-full p-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red resize-none shadow-sm"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} size="lg" />

            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 min-w-[160px] h-12 bg-brand-red hover:bg-brand-red-dark active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              {addedToast ? (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>¡Agregado!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                  <span>Agregar al carrito</span>
                  <span className="ml-1 opacity-90 font-normal">({formatMoney(totalPrice)})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleBuyWhatsApp}
              className="h-12 bg-whatsapp hover:bg-whatsapp-hover active:scale-[0.98] text-white font-bold text-sm sm:text-base px-5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-5 h-5 fill-white" aria-hidden="true" />
              <span>Comprar por WhatsApp</span>
            </button>
          </div>

          {addedToast && (
            <button type="button" onClick={openCart} className="text-sm font-bold text-brand-red underline underline-offset-2">
              Ver mi pedido
            </button>
          )}

          <div className="bg-[#FFF8ED] border border-[#F5E4CE] rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-neutral-700">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-whatsapp shrink-0" aria-hidden="true" />
              <span>{siteConfig.deliveryNote}</span>
            </div>
            <div className="font-script text-brand-red text-base font-bold hidden sm:block">Tacna sabe mejor con Retequeños ♡</div>
          </div>
        </div>
      </div>
    </div>
  );
};
