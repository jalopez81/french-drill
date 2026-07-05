import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { MemoryAddDialog } from '../components/MemoryAddDialog';
import type { MemoryItemCandidate } from '../utils/memoryPreview';

export interface MemoryAddPromptOptions {
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface MemoryAddContextValue {
  promptMemoryAdd: (
    candidates: MemoryItemCandidate[],
    options?: MemoryAddPromptOptions,
  ) => Promise<MemoryItemCandidate[] | null>;
}

const MemoryAddContext = createContext<MemoryAddContextValue | null>(null);

export function MemoryAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<MemoryItemCandidate[]>([]);
  const [options, setOptions] = useState<MemoryAddPromptOptions>({});
  const resolverRef = useRef<((value: MemoryItemCandidate[] | null) => void) | null>(null);

  const promptMemoryAdd = useCallback(
    (nextCandidates: MemoryItemCandidate[], nextOptions?: MemoryAddPromptOptions) => {
      setCandidates(nextCandidates);
      setOptions(nextOptions ?? {});
      setOpen(true);
      return new Promise<MemoryItemCandidate[] | null>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [],
  );

  const close = (value: MemoryItemCandidate[] | null) => {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  return (
    <MemoryAddContext.Provider value={{ promptMemoryAdd }}>
      {children}
      <MemoryAddDialog
        open={open}
        title={options.title ?? 'Añadir a Memoria'}
        subtitle={options.subtitle}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        candidates={candidates}
        onConfirm={(selected) => close(selected)}
        onCancel={() => close(null)}
      />
    </MemoryAddContext.Provider>
  );
}

export function useMemoryAddPrompt(): MemoryAddContextValue {
  const context = useContext(MemoryAddContext);
  if (!context) {
    throw new Error('useMemoryAddPrompt must be used within MemoryAddProvider');
  }
  return context;
}
