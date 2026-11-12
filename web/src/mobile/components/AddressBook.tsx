import React, { useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ADDRESS_MAX, MESSAGES, REFERENCE_MAX, isValidAddress, sanitizeFreeText } from '../../lib/validation';
import { MapPicker, type LatLng } from './MapPicker';

/** Direcciones de entrega guardadas en la cuenta, con su punto en el mapa (RFI-06). */
const MAX = 5;

export const AddressBook: React.FC = () => {
  const { user, updateProfile, isLoading, error } = useAuthStore();
  const addresses = user?.addresses || [];
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [location, setLocation] = useState<LatLng | undefined>();
  const [formError, setFormError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAddress(address)) { setFormError(MESSAGES.address); return; }
    setFormError(null);
    const ok = await updateProfile({
      addresses: [...addresses, { label: label.trim() || `Dirección ${addresses.length + 1}`, address: address.trim(), reference: reference.trim(), ...(location || {}) }],
    });
    if (ok) { setAdding(false); setLabel(''); setAddress(''); setReference(''); setLocation(undefined); }
  };

  const remove = (index: number) => {
    if (window.confirm('¿Eliminar esta dirección?')) updateProfile({ addresses: addresses.filter((_, i) => i !== index) });
  };

  return (
    <div className="bg-white border border-[#EFE6D6] rounded-3xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-[#242424] flex items-center gap-2"><MapPin className="w-4 h-4 text-[#C8102E]" /> Mis direcciones</h3>
        <span className="text-[11px] text-[#4B4540]">{addresses.length}/{MAX}</span>
      </div>

      {addresses.length === 0 && !adding && <p className="text-xs text-[#4B4540]">Guarda tus direcciones para pedir más rápido.</p>}
      {addresses.map((a, i) => (
        <div key={a.id || i} className="flex items-start justify-between gap-2 border border-[#F5EDE1] rounded-xl p-3">
          <div className="text-xs min-w-0">
            <p className="font-bold text-[#242424]">{a.label}</p>
            <p className="text-[#4B4540] break-words">{a.address}{a.reference ? ` · ${a.reference}` : ''}</p>
            {a.lat != null && <p className="text-[11px] text-[#13A24D] font-bold">📍 Con ubicación en el mapa</p>}
          </div>
          <button type="button" onClick={() => remove(i)} disabled={isLoading} aria-label={`Eliminar ${a.label}`} className="text-[#C8102E] p-1 cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={save} className="space-y-2.5 border-t border-[#F5EDE1] pt-3">
          <input value={label} maxLength={30} onChange={(e) => setLabel(sanitizeFreeText(e.target.value, 30))} placeholder="Nombre (Casa, Trabajo…)" aria-label="Nombre de la dirección" className="w-full h-11 px-3.5 rounded-xl border border-[#EFE6D6] text-xs bg-[#FFFDF9] focus:outline-none focus:border-[#FF3038]" />
          <input value={address} maxLength={ADDRESS_MAX} onChange={(e) => setAddress(sanitizeFreeText(e.target.value, ADDRESS_MAX))} placeholder="Dirección en Tacna *" aria-label="Dirección" className="w-full h-11 px-3.5 rounded-xl border border-[#EFE6D6] text-xs bg-[#FFFDF9] focus:outline-none focus:border-[#FF3038]" />
          <input value={reference} maxLength={REFERENCE_MAX} onChange={(e) => setReference(sanitizeFreeText(e.target.value, REFERENCE_MAX))} placeholder="Referencia (opcional)" aria-label="Referencia" className="w-full h-11 px-3.5 rounded-xl border border-[#EFE6D6] text-xs bg-[#FFFDF9] focus:outline-none focus:border-[#FF3038]" />
          <MapPicker value={location} onChange={setLocation} />
          {(formError || error) && <p role="alert" className="text-[11px] font-bold text-[#C8102E]">{formError || error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAdding(false)} className="h-10 rounded-xl border border-[#EFE6D6] text-xs font-bold cursor-pointer">Cancelar</button>
            <button type="submit" disabled={isLoading} className="h-10 rounded-xl bg-[#FF3038] text-white text-xs font-bold cursor-pointer disabled:opacity-60">{isLoading ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      ) : addresses.length < MAX && (
        <button type="button" onClick={() => setAdding(true)} className="w-full h-10 rounded-xl border border-dashed border-[#D9CDBB] text-xs font-bold text-[#242424] flex items-center justify-center gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4" /> Agregar dirección
        </button>
      )}
    </div>
  );
};
