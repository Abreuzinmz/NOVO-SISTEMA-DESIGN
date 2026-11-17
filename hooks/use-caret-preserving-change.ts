'use client';

import * as React from 'react';

type TextField = HTMLInputElement | HTMLTextAreaElement;

const INSERT_TYPES = new Set(['insertText', 'insertFromPaste', 'insertFromDrop', 'insertReplacementText']);

/**
 * Edição natural em campos controlados cujo valor é transformado no onChange
 * (ex.: `setNome(e.target.value.toUpperCase())`, remover letras, formatar).
 *
 * Causa do cursor pulando para o fim: quando o valor salvo no estado é diferente do que foi
 * digitado (o "a" virou "A"), o React reescreve o conteúdo do campo; o navegador então coloca
 * o cursor no final e perde o histórico de desfazer (Ctrl+Z).
 *
 * O que este hook faz:
 * 1. Campos que convertem para MAIÚSCULAS (detectado na primeira digitação): o texto digitado,
 *    colado ou arrastado já entra em maiúsculas pelo próprio navegador (`insertText`). Assim o
 *    valor do estado é igual ao do campo, o React não reescreve nada, o cursor fica onde está e
 *    o Ctrl+Z / Ctrl+Y continuam funcionando.
 * 2. Qualquer outra transformação: depois que o React atualiza o campo (antes da pintura), o
 *    cursor volta para a mesma posição contada a partir do fim do texto.
 * Campos cujo valor não muda no onChange não são tocados.
 */
export function useCaretPreservingChange<E extends TextField>(
  onChange: React.ChangeEventHandler<E> | undefined,
  externalRef: React.Ref<E> | undefined
) {
  const nodeRef = React.useRef<E | null>(null);
  const pending = React.useRef<{ typed: string; start: number; end: number } | null>(null);
  const uppercase = React.useRef(false);
  const detachRef = React.useRef<(() => void) | null>(null);

  const ref = React.useCallback(
    (node: E | null) => {
      detachRef.current?.();
      detachRef.current = null;
      nodeRef.current = node;
      if (typeof externalRef === 'function') externalRef(node);
      else if (externalRef) (externalRef as React.RefObject<E | null>).current = node;
      if (!node) return;

      // campo de maiúsculas: insere o texto já convertido (mantém cursor e desfazer)
      const onBeforeInput = (ev: Event) => {
        const e = ev as InputEvent;
        if (!uppercase.current || e.isComposing || !INSERT_TYPES.has(e.inputType)) return;
        const data = e.data ?? e.dataTransfer?.getData('text/plain') ?? null;
        if (!data) return;
        const upper = data.toLocaleUpperCase('pt-BR');
        if (upper === data) return;
        e.preventDefault();
        // execCommand passa pelo caminho normal de digitação: gera o evento de input (onChange),
        // respeita a seleção e entra no histórico do Ctrl+Z
        document.execCommand('insertText', false, upper);
      };
      node.addEventListener('beforeinput', onBeforeInput);
      detachRef.current = () => node.removeEventListener('beforeinput', onBeforeInput);
    },
    [externalRef]
  );

  // Devolve o cursor para a mesma posição, contada a partir do fim do texto
  const restoreCaret = React.useCallback(() => {
    const p = pending.current;
    const el = nodeRef.current;
    if (!p || !el) return;
    pending.current = null;
    if (el.value === p.typed) return; // valor não foi transformado: o navegador já cuidou do cursor
    if (el.value === p.typed.toLocaleUpperCase('pt-BR')) uppercase.current = true;
    if (typeof document !== 'undefined' && document.activeElement !== el) return;
    const len = el.value.length;
    const clamp = (n: number) => Math.max(0, Math.min(len, n));
    const end = clamp(len - (p.typed.length - p.end));
    const start = clamp(end - (p.end - p.start));
    try {
      el.setSelectionRange(start, end);
    } catch {
      /* tipo de campo sem suporte a seleção */
    }
  }, []);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<E>) => {
      const el = e.currentTarget;
      const composing = (e.nativeEvent as InputEvent).isComposing;
      // campos sem seleção de texto (number, date, email...) retornam null: não há o que preservar
      const track = !composing && el.selectionStart != null && el.selectionEnd != null;
      if (track) pending.current = { typed: el.value, start: el.selectionStart!, end: el.selectionEnd! };
      onChange?.(e);
      // se o estado não mudou (ex.: digitou uma letra num campo só de números), o React restaura o
      // campo sem renderizar de novo; então o cursor é ajustado logo depois do evento
      if (track) queueMicrotask(restoreCaret);
    },
    [onChange, restoreCaret]
  );

  // depois de cada atualização do campo, antes da pintura (sem "piscar" o cursor)
  React.useLayoutEffect(restoreCaret);

  React.useEffect(() => () => detachRef.current?.(), []);

  return { ref, handleChange };
}
