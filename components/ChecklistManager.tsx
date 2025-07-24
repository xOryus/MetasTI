import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Trash2 } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistManagerProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

/**
 * Component for managing checklist items
 * Allows adding, editing, and removing checklist items
 */
export function ChecklistManager({ items, onChange }: ChecklistManagerProps) {
  const [newItemText, setNewItemText] = useState("");

  // Adiciona um novo item ao checklist
  const addItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: `item-${Date.now()}`, // ID único baseado no timestamp
        text: newItemText.trim(),
        completed: false,
      };
      onChange([...items, newItem]);
      setNewItemText(""); // Limpa o input após adicionar
    }
  };

  // Remove um item do checklist pelo ID
  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  // Atualiza o texto de um item existente
  const updateItemText = (id: string, text: string) => {
    onChange(
      items.map((item) => 
        item.id === id ? { ...item, text } : item
      )
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Itens do Checklist</h3>
      
      {/* Lista de itens existentes */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              value={item.text}
              onChange={(e) => updateItemText(item.id, e.target.value)}
              className="flex-1"
              placeholder="Descrição do item"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Adicionar novo item */}
      <div className="flex items-center gap-2">
        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Novo item de checklist"
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" onClick={addItem} disabled={!newItemText.trim()}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}

export default ChecklistManager;
