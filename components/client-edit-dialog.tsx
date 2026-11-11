'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { User, Phone, MapPin, MessageCircle, Pencil, Tag, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, Client } from '@/lib/store';
import { cn } from '@/lib/utils';
import { maskCPFCNPJ, maskPhone, cleanNumeric, cleanPhone } from '@/lib/masks';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { FieldLabel, IconField, ContactFields, ClientConflictWarning, findClientConflicts, ClientTypeToggle, ClientDialogHeader, ClientDialogFooter, iconInputClass, clientDialogClass } from '@/components/client-form';

/** Formulário "Editar Cliente" (tela Clientes e perfil do cliente no modal da O.S.) */
export function ClientEditDialog({ client, open, onOpenChange, onDelete, nested }: {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mostra o botão "Excluir Cliente" no rodapé */
  onDelete?: () => void;
  /** Aberto por cima de outro modal (fica na frente e com o fundo escuro) */
  nested?: boolean;
}) {
  const { clients, updateClient } = useStore();
  const [editName, setEditName] = useState('');
  const [editDocument, setEditDocument] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhone2, setEditPhone2] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editClientType, setEditClientType] = useState<'regular' | 'mechanic'>('regular');
  const [editNickname, setEditNickname] = useState('');

  // Preenche com os dados atuais toda vez que abre
  useEffect(() => {
    if (!open) return;
    setEditName(client.name);
    setEditDocument(client.document ? client.document.replace(/\D/g, '') : '');
    setEditPhone(client.phone ? client.phone.replace(/\D/g, '') : '');
    setEditPhone2(client.phone2 ? client.phone2.replace(/\D/g, '') : '');
    setEditWhatsapp(client.whatsapp ? client.whatsapp.replace(/\D/g, '') : '');
    setEditCity(client.city || '');
    setEditClientType(client.clientType || 'regular');
    setEditNickname(client.nickname || '');
  }, [open, client]);

  const editConflicts = useMemo(
    () => findClientConflicts(clients || [], { name: editName, phones: [editPhone, editPhone2, editWhatsapp], document: editDocument }, client.id),
    [clients, editName, editPhone, editPhone2, editWhatsapp, editDocument, client.id]
  );

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) { toast.error('O nome do cliente é obrigatório.'); return; }
    if (editConflicts.length > 0) { toast.error('Já existe outro cliente com esse nome, telefone ou CPF/CNPJ.'); return; }
    if (editPhone && editPhone.length < 10) { toast.error('Telefone inválido. Digite no mínimo 10 números (com DDD).'); return; }
    if (editWhatsapp && editWhatsapp.length < 10) { toast.error('WhatsApp inválido. Digite no mínimo 10 números (com DDD).'); return; }
    if (editDocument && editDocument.length !== 11 && editDocument.length !== 14) { toast.error('CPF ou CNPJ inválido.'); return; }
    if (editDocument && clients.some(c => c.id !== client.id && c.document === maskCPFCNPJ(editDocument))) { toast.error('Este CPF/CNPJ já está cadastrado para outro cliente.'); return; }
    if (editPhone) {
      const cleanEditPhone = cleanPhone(editPhone);
      if (clients.some(c => c.id !== client.id && c.phone && cleanPhone(c.phone) === cleanEditPhone)) {
        toast.error('Este número de telefone já está cadastrado para outro cliente.');
        return;
      }
    }

    await updateClient(client.id, {
      name: editName.toUpperCase(),
      document: editDocument ? maskCPFCNPJ(editDocument) : '',
      phone: editPhone ? maskPhone(editPhone) : '',
      phone2: editPhone2 ? maskPhone(editPhone2) : '',
      whatsapp: editWhatsapp ? maskPhone(editWhatsapp) : '',
      city: editCity,
      clientType: editClientType,
      nickname: editNickname.trim().toUpperCase(),
      defaultMechanicId: editClientType === 'regular' ? (client.defaultMechanicId || '') : '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(clientDialogClass, nested && 'z-[1300]')}
        overlayClassName={nested ? 'z-[1299]' : undefined}
        forceOverlay={nested}
      >
        <ClientDialogHeader icon={Pencil} title="Editar Cliente" subtitle="Atualize os dados do cliente." onClose={() => onOpenChange(false)} />
        <form onSubmit={handleEditClient} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-1 pb-6 space-y-4">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="edit-name" required>Nome completo</FieldLabel>
                <IconField icon={User}>
                  <Input id="edit-name" placeholder="Digite o nome completo do cliente" value={editName} onChange={e => setEditName(e.target.value.toUpperCase())} className={cn(iconInputClass, 'uppercase placeholder:normal-case')} />
                </IconField>
              </div>
              <ClientConflictWarning conflicts={editConflicts} />
              <div className="space-y-1.5 sm:max-w-[calc(50%-8px)]">
                <FieldLabel htmlFor="edit-nickname" optional>Apelido / Nome fantasia</FieldLabel>
                <IconField icon={Tag}>
                  <Input id="edit-nickname" placeholder="Apelido ou nome fantasia" value={editNickname} onChange={e => setEditNickname(e.target.value.toUpperCase())} className={cn(iconInputClass, 'uppercase placeholder:normal-case')} />
                </IconField>
              </div>
              <div className="space-y-1.5 sm:max-w-[calc(50%-8px)]">
                <FieldLabel htmlFor="edit-document" optional>CPF/CNPJ</FieldLabel>
                <IconField icon={FileText}>
                  <MaskedInput id="edit-document" placeholder="000.000.000-00" value={editDocument} mask={maskCPFCNPJ} unmask={cleanNumeric} onValueChange={setEditDocument} className={iconInputClass} />
                </IconField>
              </div>
              <ContactFields
                primary={(
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="edit-phone" optional>Telefone</FieldLabel>
                    <IconField icon={Phone}>
                      <MaskedInput id="edit-phone" placeholder="(00) 00000-0000" value={editPhone} mask={maskPhone} unmask={cleanPhone} onValueChange={setEditPhone} className={iconInputClass} />
                    </IconField>
                  </div>
                )}
                extras={[
                  { key: 'phone2', label: 'Telefone 2', fixed: true, hasValue: !!editPhone2, onRemove: () => setEditPhone2(''), field: (
                    <IconField icon={Phone}>
                      <MaskedInput id="edit-phone2" placeholder="(00) 00000-0000" value={editPhone2} mask={maskPhone} unmask={cleanPhone} onValueChange={setEditPhone2} className={iconInputClass} />
                    </IconField>
                  ) },
                  { key: 'whatsapp', label: 'WhatsApp', hasValue: !!editWhatsapp, onRemove: () => setEditWhatsapp(''), field: (
                    <IconField icon={MessageCircle}>
                      <MaskedInput id="edit-whatsapp" placeholder="(00) 00000-0000" value={editWhatsapp} mask={maskPhone} unmask={cleanPhone} onValueChange={setEditWhatsapp} className={iconInputClass} />
                    </IconField>
                  ) },
                ]}
              />
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_280px] gap-4 items-end">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="edit-city" optional>Cidade / Endereço</FieldLabel>
                <IconField icon={MapPin}>
                  <Input id="edit-city" placeholder="Ex: Curitiba - PR ou rua e número" value={editCity} onChange={e => setEditCity(e.target.value)} className={iconInputClass} />
                </IconField>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Tipo de cliente</FieldLabel>
                <ClientTypeToggle value={editClientType} onChange={setEditClientType} />
              </div>
            </div>
          </div>
          <ClientDialogFooter
            onCancel={() => onOpenChange(false)}
            saveDisabled={editConflicts.length > 0}
            saveLabel="Salvar Alterações"
            onDelete={onDelete ? () => { onOpenChange(false); onDelete(); } : undefined}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
