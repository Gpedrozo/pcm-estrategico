import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Search, X } from 'lucide-react';
import { useEquipamentos, type EquipamentoRow } from '@/hooks/useEquipamentos';

interface TagEquipamentoInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function TagEquipamentoInput({ value, onChange, disabled, required }: TagEquipamentoInputProps) {
  const { data: equipamentos } = useEquipamentos();
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(value || '');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atualiza o input quando o value externo muda
  useEffect(() => {
    setInputValue(value || '');
    setSelectedTag(value || '');
  }, [value]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra equipamentos por TAG ou Nome (case insensitive)
  const filteredEquipamentos = useMemo(() => {
    if (!equipamentos || !inputValue.trim()) return [];
    const term = inputValue.trim().toLowerCase();
    return equipamentos
      .filter(e => e.ativo)
      .filter(e =>
        e.tag.toLowerCase().includes(term) ||
        e.nome.toLowerCase().includes(term) ||
        `${e.tag} - ${e.nome}`.toLowerCase().includes(term)
      )
      .slice(0, 20); // Limita a 20 resultados
  }, [equipamentos, inputValue]);

  // Verifica se o valor atual corresponde a um equipamento cadastrado
  const isRegisteredEquipment = useMemo(() => {
    if (!equipamentos || !selectedTag) return false;
    return equipamentos.some(e => e.ativo && e.tag === selectedTag);
  }, [equipamentos, selectedTag]);

  const handleSelect = (equip: EquipamentoRow) => {
    setSelectedTag(equip.tag);
    setInputValue(`${equip.tag} - ${equip.nome}`);
    onChange(equip.tag);
    setIsOpen(false);
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    setSelectedTag('');
    setIsOpen(true);

    // Se o texto estiver vazio, limpa o valor
    if (!text.trim()) {
      onChange('');
      return;
    }

    // Verifica se o texto corresponde exatamente a uma TAG conhecida
    const exactMatch = equipamentos?.find(
      e => e.ativo && e.tag.toLowerCase() === text.trim().toLowerCase()
    );
    if (exactMatch) {
      setSelectedTag(exactMatch.tag);
      onChange(exactMatch.tag);
    } else {
      // Texto livre (equipamento não cadastrado)
      onChange(text.trim());
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSelectedTag('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
    if (e.key === 'Enter' && filteredEquipamentos.length === 1) {
      handleSelect(filteredEquipamentos[0]);
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-2 relative">
      <Label>
        TAG do Equipamento {required && <span className="text-destructive">*</span>}
        <span className="text-xs text-muted-foreground ml-2 font-normal">
          (digite para buscar por TAG ou nome do equipamento)
        </span>
      </Label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => inputValue.trim() && setIsOpen(true)}
          placeholder="Buscar por TAG, nome do equipamento ou digite livre..."
          disabled={disabled}
          className="pl-9 pr-8"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Indicador de equipamento cadastrado vs texto livre */}
      {selectedTag && (
        <div className={`text-xs flex items-center gap-1 ${
          isRegisteredEquipment ? 'text-success' : 'text-warning'
        }`}>
          {isRegisteredEquipment ? (
            <>
              <Check className="h-3 w-3" />
              Equipamento cadastrado: <span className="font-mono font-medium">{selectedTag}</span>
            </>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-warning" />
              Equipamento não cadastrado — texto livre: <span className="font-medium">"{selectedTag}"</span>
            </>
          )}
        </div>
      )}

      {/* Dropdown de sugestões */}
      {isOpen && inputValue.trim() && filteredEquipamentos.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {filteredEquipamentos.map((equip) => {
              const isSelected = selectedTag === equip.tag;
              return (
                <li key={equip.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(equip)}
                    className={`w-full text-left px-3 py-2 hover:bg-muted transition flex items-center gap-2 ${
                      isSelected ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-primary">
                          {equip.tag}
                        </span>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-success shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {equip.nome}
                        {equip.localizacao && ` • ${equip.localizacao}`}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {equipamentos && equipamentos.filter(e => e.ativo).length > filteredEquipamentos.length && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border">
              Mostrando {filteredEquipamentos.length} de {equipamentos.filter(e => e.ativo).length} equipamentos
            </div>
          )}
        </div>
      )}

      {/* Mensagem quando não encontra resultados */}
      {isOpen && inputValue.trim() && filteredEquipamentos.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3">
          <p className="text-sm text-muted-foreground">
            Nenhum equipamento encontrado para "<span className="font-medium">{inputValue.trim()}</span>"
          </p>
          <p className="text-xs text-warning mt-1">
            O texto digitado será usado como TAG livre (equipamento não cadastrado).
          </p>
        </div>
      )}
    </div>
  );
}