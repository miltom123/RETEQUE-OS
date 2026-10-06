import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { useCartStore } from '../../store/cartStore';
import { useCheckoutStore } from '../../store/checkoutStore';
import { openWhatsApp } from '../../lib/whatsapp';
import type { PromoConfig } from '../../data/promotions';

import {
  TEQUEÑO_FLAVORS,
  PIZZA_FLAVORS,
  CREAMS,
  DRINKS,
  UPGRADES,
} from './configuratorData';
import { PizzaStep } from './steps/PizzaStep';
import { TequenosStep } from './steps/TequenosStep';
import { CreamsStep } from './steps/CreamsStep';
import { DrinksStep } from './steps/DrinksStep';
import { UpgradesStep } from './steps/UpgradesStep';
import { ConfiguratorFooter } from './ConfiguratorFooter';
import { DirectCheckoutModal } from './DirectCheckoutModal';

import type { ConfigurableItem } from '../../store/uiStore';
import type { Promotion } from '../../data/promotions';

interface ProductConfiguratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  productOrPromo: ConfigurableItem;
  onOpenCartDrawer?: () => void;
}

function isPromotion(item: ConfigurableItem): item is Promotion {
  return 'config' in item && typeof (item as Promotion).config === 'object';
}

export const ProductConfiguratorModal: React.FC<ProductConfiguratorModalProps> = ({
  isOpen,
  onClose,
  productOrPromo,
  onOpenCartDrawer,
}) => {
  const addItem = useCartStore((state) => state.addItem);
  const { fullName, phone, deliveryType, address, reference, generalNotes } = useCheckoutStore();

  const isPromo = isPromotion(productOrPromo);
  const promoConfig: PromoConfig | undefined = isPromo ? productOrPromo.config : undefined;

  // Selected presentation for regular tequeños
  const [selectedPresentation, setSelectedPresentation] = useState<string>('10 unid.');
  const [quantity, setQuantity] = useState(1);

  // Reglas deterministas basadas en el modelo de datos (cero string-sniffing)
  const hasTequeños = promoConfig
    ? promoConfig.tequenos > 0
    : productOrPromo.category === 'tequenos';

  const hasPizza = promoConfig
    ? promoConfig.pizzas > 0
    : productOrPromo.category === 'pizzas';

  const targetPizzasCount = promoConfig
    ? promoConfig.pizzas
    : hasPizza
    ? 1
    : 0;

  const targetTequeños = promoConfig
    ? promoConfig.tequenos
    : hasTequeños
    ? (selectedPresentation.includes('40') ? 40 : selectedPresentation.includes('20') ? 20 : selectedPresentation.includes('5') ? 5 : 10)
    : 0;

  const targetCreams = promoConfig
    ? promoConfig.creams
    : hasTequeños
    ? 2
    : 0;

  const includesDrink = promoConfig ? promoConfig.drink : false;

  // Pizza flavor selection (array of flavor ids up to targetPizzasCount)
  const [selectedPizzaFlavors, setSelectedPizzaFlavors] = useState<string[]>(['americana']);

  // Flavors selection for tequeños
  const [flavorCounts, setFlavorCounts] = useState<Record<string, number>>({});

  // Creams selection
  const [creamCounts, setCreamCounts] = useState<Record<string, number>>({
    'mayonesa-ajo': 1,
    'salsa-tocino': 1,
  });

  // Drink selection
  const [selectedDrinkId, setSelectedDrinkId] = useState<string>('inka-cola-600');

  // Upgrades selection
  const [upgradeCounts, setUpgradeCounts] = useState<Record<string, number>>({});

  // Accordion active step
  const [openSection, setOpenSection] = useState<'pizzas' | 'receta' | 'cremas' | 'bebida' | 'agranda' | ''>('receta');

  // WhatsApp checkout prompt
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});

  // Bloquea el scroll del fondo y cierra con Escape mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Sync state when productOrPromo changes
  useEffect(() => {
    if (productOrPromo) {
      if (hasPizza) {
        if (targetPizzasCount === 2) {
          setSelectedPizzaFlavors(['americana', 'peperoni']);
        } else {
          setSelectedPizzaFlavors(['americana']);
        }
        setOpenSection(hasPizza && !hasTequeños ? 'pizzas' : 'receta');
      } else {
        setOpenSection('receta');
      }

      if (hasTequeños && targetTequeños > 0) {
        if (targetTequeños === 40) {
          setFlavorCounts({ queso: 20, 'jamon-queso': 20 });
        } else if (targetTequeños === 20) {
          setFlavorCounts({ queso: 10, 'jamon-queso': 10 });
        } else if (targetTequeños === 5) {
          setFlavorCounts({ queso: 5 });
        } else {
          setFlavorCounts({ queso: 10 });
        }
      } else {
        setFlavorCounts({});
      }

      if (targetCreams === 4) {
        setCreamCounts({
          'mayonesa-ajo': 1,
          'salsa-tocino': 1,
          mayopalta: 1,
          'aji-especial': 1,
        });
      } else if (targetCreams === 3) {
        setCreamCounts({
          'mayonesa-ajo': 1,
          'salsa-tocino': 1,
          mayopalta: 1,
        });
      } else {
        setCreamCounts({
          'mayonesa-ajo': 1,
          'salsa-tocino': 1,
        });
      }

      setQuantity(1);
      setUpgradeCounts({});
      setSelectedDrinkId('inka-cola-600');
    }
  }, [productOrPromo, hasPizza, hasTequeños, targetTequeños, targetCreams, targetPizzasCount]);

  if (!isOpen || !productOrPromo) return null;

  // Calculo de precio base
  let calculatedBasePrice = isPromo ? productOrPromo.price : (productOrPromo.basePrice || 0);
  if (!isPromo && selectedPresentation === '20 unid.' && productOrPromo.presentations) {
    const pres20 = productOrPromo.presentations.find((p: any) => p.label.includes('20'));
    if (pres20) calculatedBasePrice = pres20.price;
  }

  // Costo extra de bebidas si aplica
  const selectedDrink = DRINKS.find((d) => d.id === selectedDrinkId);
  const drinkExtraPrice = includesDrink && selectedDrink ? selectedDrink.extraPrice : 0;

  // Costo upgrades
  const upgradesPriceTotal = Object.entries(upgradeCounts).reduce((sum, [id, count]) => {
    const upgrade = UPGRADES.find((u) => u.id === id);
    return sum + (upgrade ? upgrade.price * count : 0);
  }, 0);

  const unitTotalPrice = calculatedBasePrice + drinkExtraPrice + upgradesPriceTotal;
  const grandTotalPrice = unitTotalPrice * quantity;

  // Status de selección
  const totalSelectedTequeños = Object.values(flavorCounts).reduce((a, b) => a + b, 0);
  const isFlavorsCompleted = !hasTequeños || targetTequeños === 0 || totalSelectedTequeños === targetTequeños;

  const totalSelectedCreams = Object.values(creamCounts).reduce((a, b) => a + b, 0);
  const isCreamsCompleted = totalSelectedCreams === targetCreams;

  // Flavor handlers
  const handleFlavorDelta = (flavorId: string, delta: number) => {
    setFlavorCounts((prev) => {
      const current = prev[flavorId] || 0;
      const nextVal = Math.max(0, current + delta);
      const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0);

      if (delta > 0 && currentTotal >= targetTequeños) {
        return prev;
      }

      const next = { ...prev };
      if (nextVal === 0) {
        delete next[flavorId];
      } else {
        next[flavorId] = nextVal;
      }
      return next;
    });
  };

  // Creams handlers
  const handleCreamDelta = (creamId: string, delta: number) => {
    setCreamCounts((prev) => {
      const current = prev[creamId] || 0;
      const nextVal = Math.max(0, current + delta);
      const currentTotal = Object.values(prev).reduce((a, b) => a + b, 0);

      if (delta > 0 && currentTotal >= targetCreams) {
        return prev;
      }

      const next = { ...prev };
      if (nextVal === 0) {
        delete next[creamId];
      } else {
        next[creamId] = nextVal;
      }
      return next;
    });
  };

  // Upgrade handlers
  const handleUpgradeDelta = (upgradeId: string, delta: number) => {
    setUpgradeCounts((prev) => {
      const current = prev[upgradeId] || 0;
      const nextVal = Math.max(0, current + delta);
      const next = { ...prev };
      if (nextVal === 0) {
        delete next[upgradeId];
      } else {
        next[upgradeId] = nextVal;
      }
      return next;
    });
  };

  // Pizza flavor toggle handler
  const handleSelectPizzaFlavor = (flavorId: string, slotIndex: number) => {
    setSelectedPizzaFlavors((prev) => {
      const updated = [...prev];
      updated[slotIndex] = flavorId;
      return updated;
    });
  };

  const flavorsSummaryText = hasTequeños
    ? Object.entries(flavorCounts)
        .map(([id, count]) => {
          const fl = TEQUEÑO_FLAVORS.find((f) => f.id === id);
          return `${fl?.name || id} x ${count} un`;
        })
        .join(', ') || 'Pendiente de selección'
    : 'No incluye';

  const pizzasSummaryText = hasPizza
    ? selectedPizzaFlavors
        .map((id, idx) => {
          const pz = PIZZA_FLAVORS.find((f) => f.id === id);
          return `Pizza ${idx + 1}: ${pz?.name.split(' (')[0] || id}`;
        })
        .join(', ')
    : '';

  const creamsSummaryText = Object.entries(creamCounts)
    .map(([id, count]) => {
      const cr = CREAMS.find((c) => c.id === id);
      return `${cr?.name.replace(' (2 oz)', '') || id} x ${count}`;
    })
    .join(', ') || 'Pendiente de selección';

  const upgradesCountTotal = Object.values(upgradeCounts).reduce((a, b) => a + b, 0);

  // Generate WhatsApp message with 100% Retequeños branding
  const buildWhatsAppMessage = (ordId?: string) => {
    const lines: string[] = [
      '🧀 *¡HOLA RETEQUEÑOS!* 👋',
    ];

    if (ordId) {
      lines.push(`🔖 *PEDIDO / COMANDA: ${ordId}*`);
    }

    lines.push(
      '',
      'Quiero realizar el siguiente pedido personalizado:',
      '',
      `📦 *${quantity} x ${productOrPromo.name}* — ${formatMoney(grandTotalPrice)}`,
    );

    if (productOrPromo.description) {
      lines.push(`   📝 ${productOrPromo.description}`);
    }

    if (hasPizza) {
      lines.push('');
      lines.push(`🍕 *PIZZAS FAMILIARES 35 CM:*`);
      selectedPizzaFlavors.forEach((id, idx) => {
        const pz = PIZZA_FLAVORS.find((f) => f.id === id);
        lines.push(`   • Pizza ${idx + 1}: ${pz?.name || id}`);
      });
    }

    if (hasTequeños && targetTequeños > 0) {
      lines.push('');
      lines.push(`👉 *SABORES DE TEQUEÑOS (${totalSelectedTequeños} unid.):*`);
      Object.entries(flavorCounts).forEach(([id, count]) => {
        const fl = TEQUEÑO_FLAVORS.find((f) => f.id === id);
        lines.push(`   • ${count} un. de ${fl?.name || id}`);
      });
    }

    lines.push('');
    lines.push(`🥣 *CREMAS INCLUIDAS (${totalSelectedCreams} unid.):*`);
    Object.entries(creamCounts).forEach(([id, count]) => {
      const cr = CREAMS.find((c) => c.id === id);
      lines.push(`   • ${count} x ${cr?.name || id}`);
    });

    if (includesDrink && selectedDrink) {
      lines.push('');
      lines.push(`🥤 *BEBIDA ELEGIDA:*`);
      lines.push(`   • ${selectedDrink.name}${selectedDrink.extraPrice > 0 ? ` (+${formatMoney(selectedDrink.extraPrice)})` : ''}`);
    }

    if (upgradesCountTotal > 0) {
      lines.push('');
      lines.push(`➕ *ADICIONALES MARCADOS:*`);
      Object.entries(upgradeCounts).forEach(([id, count]) => {
        const up = UPGRADES.find((u) => u.id === id);
        if (up) {
          lines.push(`   • ${count} x ${up.name} (+${formatMoney(up.price * count)})`);
        }
      });
    }

    lines.push('');
    lines.push(`💰 *TOTAL PEDIDO:* ${formatMoney(grandTotalPrice)}`);
    lines.push(`🚚 *TIPO DE ENTREGA:* ${deliveryType === 'delivery' ? 'Delivery (por confirmar)' : 'Recojo en tienda (S/ 0.00)'}`);
    lines.push('');
    lines.push('👤 *DATOS DEL CLIENTE:*');
    lines.push(`• Nombre: ${fullName || 'No especificado'}`);
    lines.push(`• Celular: ${phone || 'No especificado'}`);

    if (deliveryType === 'delivery') {
      lines.push(`• Dirección: ${address || 'No especificada'}`);
      if (reference) {
        lines.push(`• Referencia: ${reference}`);
      }
    }

    if (generalNotes) {
      lines.push(`• Indicaciones: ${generalNotes}`);
    }

    lines.push('');
    lines.push('Deseo confirmar disponibilidad, delivery y realizar el pago por Yape/Plin/Transferencia. ¡Gracias!');

    return lines.join('\n');
  };

  const handleComprarAhora = () => {
    setIsCheckoutModalOpen(true);
  };

  const handleModalConfirmWhatsApp = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Ingresa tu nombre completo';
    if (!phone.trim()) errs.phone = 'Ingresa tu número de celular';
    if (deliveryType === 'delivery' && !address.trim()) errs.address = 'Ingresa tu dirección para el delivery';

    if (Object.keys(errs).length > 0) {
      setCheckoutErrors(errs);
      return;
    }

    setCheckoutErrors({});
    setIsCheckoutModalOpen(false);

    openWhatsApp(buildWhatsAppMessage());
  };

  const handleAddToCart = () => {
    const optionsList: string[] = [];

    if (hasPizza) {
      selectedPizzaFlavors.forEach((id, idx) => {
        const pz = PIZZA_FLAVORS.find((f) => f.id === id);
        optionsList.push(`Pizza ${idx + 1}: ${pz?.name.split(' (')[0] || id}`);
      });
    }

    if (hasTequeños && targetTequeños > 0) {
      Object.entries(flavorCounts).forEach(([id, count]) => {
        const fl = TEQUEÑO_FLAVORS.find((f) => f.id === id);
        optionsList.push(`${fl?.name || id} (${count} un.)`);
      });
    }

    Object.entries(creamCounts).forEach(([id, count]) => {
      const cr = CREAMS.find((c) => c.id === id);
      optionsList.push(`${cr?.name.replace(' (2 oz)', '') || id} (x${count})`);
    });

    if (includesDrink && selectedDrink) {
      optionsList.push(`Bebida: ${selectedDrink.name}`);
    }

    Object.entries(upgradeCounts).forEach(([id, count]) => {
      const up = UPGRADES.find((u) => u.id === id);
      if (up) {
        optionsList.push(`+ ${count} x ${up.name}`);
      }
    });

    addItem({
      productId: productOrPromo.id,
      name: productOrPromo.name,
      image: productOrPromo.image,
      quantity,
      unitPrice: unitTotalPrice,
      selectedPresentation: isPromo ? undefined : selectedPresentation,
      selectedOptions: optionsList.length > 0 ? optionsList : undefined,
    });

    onClose();
    if (onOpenCartDrawer) {
      onOpenCartDrawer();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#FAF8F5] w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 border border-neutral-200/80">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={productOrPromo.image}
              alt={productOrPromo.name}
              className="w-12 h-12 object-cover rounded-xl border border-neutral-200 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFF0F1] text-[#C5161D]">
                  {isPromo ? 'Promo Especial' : productOrPromo.category || 'Carta'}
                </span>
                <span className="text-xs font-bold text-neutral-400">Personaliza tu orden</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 leading-tight line-clamp-1">
                {productOrPromo.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-32 sm:pb-28">
          
          {/* Description & presentation badge */}
          {productOrPromo.description && (
            <div className="bg-white border border-neutral-200 p-3.5 rounded-2xl text-xs text-neutral-600">
              <span className="font-bold text-neutral-900">Incluye: </span>
              {productOrPromo.description}
            </div>
          )}

          {/* Regular Tequeños presentation switch (10 vs 20 unid.) */}
          {!isPromo && productOrPromo.presentations && productOrPromo.presentations.length > 1 && (
            <div className="bg-white border border-neutral-200 p-3.5 rounded-2xl space-y-2">
              <label className="text-xs font-black text-neutral-900 block">
                Selecciona la porción:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {productOrPromo.presentations.map((pres: any) => {
                  const isSelected = selectedPresentation === pres.label;
                  return (
                    <button
                      key={pres.id}
                      type="button"
                      onClick={() => setSelectedPresentation(pres.label)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#C5161D] bg-[#FFF0F1] text-neutral-900 font-bold'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                      }`}
                    >
                      <span className="text-xs">{pres.label}</span>
                      <span className="text-xs font-black text-[#C5161D]">{formatMoney(pres.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 1: Pizzas */}
          {hasPizza && (
            <PizzaStep
              isOpen={openSection === 'pizzas'}
              onToggle={() => setOpenSection(openSection === 'pizzas' ? '' : 'pizzas')}
              targetPizzasCount={targetPizzasCount}
              pizzasSummaryText={pizzasSummaryText}
              selectedPizzaFlavors={selectedPizzaFlavors}
              onSelectFlavor={handleSelectPizzaFlavor}
            />
          )}

          {/* STEP 2: Tequeños Flavors */}
          {hasTequeños && targetTequeños > 0 && (
            <TequenosStep
              isOpen={openSection === 'receta'}
              onToggle={() => setOpenSection(openSection === 'receta' ? '' : 'receta')}
              targetTequeños={targetTequeños}
              totalSelectedTequeños={totalSelectedTequeños}
              isFlavorsCompleted={isFlavorsCompleted}
              flavorCounts={flavorCounts}
              onFlavorDelta={handleFlavorDelta}
            />
          )}

          {/* STEP 3: Cremas */}
          <CreamsStep
            isOpen={openSection === 'cremas'}
            onToggle={() => setOpenSection(openSection === 'cremas' ? '' : 'cremas')}
            targetCreams={targetCreams}
            totalSelectedCreams={totalSelectedCreams}
            isCreamsCompleted={isCreamsCompleted}
            creamCounts={creamCounts}
            onCreamDelta={handleCreamDelta}
          />

          {/* STEP 4: Drinks */}
          {includesDrink && (
            <DrinksStep
              isOpen={openSection === 'bebida'}
              onToggle={() => setOpenSection(openSection === 'bebida' ? '' : 'bebida')}
              selectedDrinkId={selectedDrinkId}
              selectedDrink={selectedDrink}
              onSelectDrink={setSelectedDrinkId}
            />
          )}

          {/* STEP 5: Upgrades */}
          <UpgradesStep
            isOpen={openSection === 'agranda'}
            onToggle={() => setOpenSection(openSection === 'agranda' ? '' : 'agranda')}
            upgradeCounts={upgradeCounts}
            onUpgradeDelta={handleUpgradeDelta}
          />
        </div>

        {/* Sticky Action Bottom Bar */}
        <ConfiguratorFooter
          quantity={quantity}
          onSetQuantity={setQuantity}
          grandTotalPrice={grandTotalPrice}
          onAddToCart={handleAddToCart}
          onComprarAhora={handleComprarAhora}
        />

        {/* Direct WhatsApp Checkout Sub-Modal */}
        <DirectCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          onConfirm={handleModalConfirmWhatsApp}
          productName={productOrPromo.name}
          quantity={quantity}
          grandTotalPrice={grandTotalPrice}
          hasPizza={hasPizza}
          pizzasSummaryText={pizzasSummaryText}
          hasTequeños={hasTequeños}
          targetTequeños={targetTequeños}
          flavorsSummaryText={flavorsSummaryText}
          creamsSummaryText={creamsSummaryText}
          includesDrink={includesDrink}
          selectedDrinkName={selectedDrink?.name}
          errors={checkoutErrors}
        />
      </div>
    </div>,
    document.body
  );
};
