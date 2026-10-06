'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sidebar, View } from '@/components/sidebar';
import { Dashboard } from '@/components/dashboard';
import { Clients } from '@/components/clients';
import { History } from '@/components/history';
import { OSForm } from '@/components/os-form';
import { PriceManager } from '@/components/price-manager';
import { useStore, Order } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [newOrderClientId, setNewOrderClientId] = useState<string | undefined>(undefined);
  const { isLoaded } = useStore();
  const mainRef = useRef<HTMLElement>(null);

  // The <main> scroll container is shared across every view — it isn't remounted when
  // currentView changes, so without this its scroll position carries over from whatever
  // page was open before (e.g. landing on the dashboard scrolled to where the O.S. form was).
  // Depending on which view is active, the overflow can end up on <main> itself or on the
  // window/document (e.g. when a view's content isn't height-constrained), so reset both.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [currentView]);

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Carregando Sistema Retifica Mendonça...</p>
      </div>
    );
  }

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsReadOnly(false);
    setCurrentView('new-os');
  };

  const handleNewOrderForClient = (clientId: string) => {
    setEditingOrder(null);
    setIsReadOnly(false);
    setNewOrderClientId(clientId);
    setCurrentView('new-os');
  };

  const handleViewOrder = (order: Order) => {
    setEditingOrder(order);
    setIsReadOnly(true);
    setCurrentView('new-os');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onEdit={handleEditOrder} onView={handleViewOrder} />;
      case 'clients':
        return <Clients onEdit={handleEditOrder} onView={handleViewOrder} onNewOrder={handleNewOrderForClient} />;
      case 'history':
        return <History />;
      case 'prices':
        return <PriceManager />;
      case 'new-os':
        return (
          <OSForm
            order={editingOrder || undefined}
            readOnly={isReadOnly}
            initialClientId={editingOrder ? undefined : newOrderClientId}
            onComplete={() => {
              setNewOrderClientId(undefined);
              setEditingOrder(null);
              setIsReadOnly(false);
              setCurrentView('dashboard');
            }}
          />
        );
      default:
        return <Dashboard onEdit={handleEditOrder} onView={handleViewOrder} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background particles-bg">
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          setEditingOrder(null);
          setNewOrderClientId(undefined);
          setIsReadOnly(false);
          setCurrentView(view);
        }}
      />

      <main ref={mainRef} className={`flex-1 p-8 overflow-y-auto ${currentView === 'dashboard' ? 'dashboard-content' : ''}`} style={{ overflowAnchor: 'none' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

//sanduiche