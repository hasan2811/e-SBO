
'use client';

import * as React from 'react';
import { Plus, ClipboardList, Wrench, FileSignature } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePerformance } from '@/contexts/performance-context';

interface MultiActionButtonProps {
  onNewObservation: () => void;
  onNewInspection: () => void;
  onNewPtw: () => void;
}

export function MultiActionButton({ onNewObservation, onNewInspection, onNewPtw }: MultiActionButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { isFastConnection } = usePerformance();

  const parentVariants = {
    closed: { rotate: 0 },
    open: { rotate: 135 },
  };

  const childVariants = {
    closed: { opacity: 0, y: 15, scale: 0.8 },
    open: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 15, scale: 0.8 },
  };

  const childTransition = isFastConnection
    ? { type: 'spring', stiffness: 300, damping: 20 }
    : { duration: 0 };
    
  const parentTransition = isFastConnection
    ? { duration: 0.3, ease: 'easeInOut' }
    : { duration: 0 };

  const actions = [
    { label: 'Buat Observasi', icon: ClipboardList, action: onNewObservation, color: 'bg-accent' },
    { label: 'Buat Inspeksi', icon: Wrench, action: onNewInspection, color: 'bg-chart-2' },
    { label: 'Buat PTW', icon: FileSignature, action: onNewPtw, color: 'bg-chart-5' },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden">
      <TooltipProvider delayDuration={200}>
        <div className="relative flex flex-col items-center gap-3">
          <AnimatePresence>
            {isOpen && actions.map((item, index) => (
              <motion.div
                key={item.label}
                variants={childVariants}
                initial="closed"
                animate="open"
                exit="exit"
                transition={{ ...childTransition, delay: isFastConnection ? index * 0.04 : 0 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                      <Button
                          size="icon"
                          className={`rounded-full h-12 w-12 shadow-lg ${item.color} text-white hover:${item.color}/90`}
                          onClick={() => {
                            item.action();
                            setIsOpen(false);
                          }}
                      >
                          <item.icon className="h-6 w-6" />
                          <span className="sr-only">{item.label}</span>
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                      <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <Button
            size="icon"
            className="rounded-full h-16 w-16 shadow-2xl"
            onClick={() => setIsOpen(!isOpen)}
          >
            <motion.div
              variants={parentVariants}
              animate={isOpen ? 'open' : 'closed'}
              transition={parentTransition}
            >
              <Plus className="h-8 w-8 transition-transform" />
            </motion.div>
            <span className="sr-only">{isOpen ? 'Tutup menu aksi' : 'Buka menu aksi'}</span>
          </Button>
        </div>
      </TooltipProvider>
    </div>
  );
}
