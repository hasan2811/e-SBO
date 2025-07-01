
'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ClipboardList, Wrench, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MultiActionButtonProps {
  onObservationClick: () => void;
  onInspectionClick: () => void;
  onPtwClick: () => void;
}

const actionItems = [
  {
    label: 'Observation',
    icon: ClipboardList,
    key: 'observation',
    color: 'bg-primary hover:bg-primary/90',
  },
  {
    label: 'Inspection',
    icon: Wrench,
    key: 'inspection',
    color: 'bg-chart-5 hover:bg-chart-5/90',
  },
  {
    label: 'PTW',
    icon: FileSignature,
    key: 'ptw',
    color: 'bg-chart-2 hover:bg-chart-2/90',
  },
];

export function MultiActionButton({
  onObservationClick,
  onInspectionClick,
  onPtwClick,
}: MultiActionButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleActionClick = (key: string) => {
    setIsOpen(false);
    switch (key) {
      case 'observation':
        onObservationClick();
        break;
      case 'inspection':
        onInspectionClick();
        break;
      case 'ptw':
        onPtwClick();
        break;
    }
  };
  
  const menuVariants = {
    open: {
      transition: { staggerChildren: 0.07, delayChildren: 0.2 },
    },
    closed: {
      transition: { staggerChildren: 0.05, staggerDirection: -1 },
    },
  };

  const itemVariants = {
    open: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 24,
      },
    },
    closed: {
      y: 30,
      opacity: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 24,
      },
    },
  };

  const mainButtonVariants = {
    open: {
      rotate: 405, // 360 (full spin) + 45 (to make a cross)
      backgroundColor: 'hsl(var(--card))',
      color: 'hsl(var(--primary))',
      borderColor: 'hsl(var(--primary))'
    },
    closed: {
      rotate: 0,
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      borderColor: 'hsl(var(--primary))'
    },
  };

  return (
    <TooltipProvider>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      
      <div className="fixed bottom-20 right-6 md:right-8 z-40">
        <motion.div
          className="flex flex-col-reverse items-end gap-4"
          initial="closed"
          animate={isOpen ? 'open' : 'closed'}
          variants={menuVariants}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="h-16 w-16 rounded-full flex items-center justify-center shadow-lg border-2"
                aria-label="Toggle Actions Menu"
                aria-expanded={isOpen}
                variants={mainButtonVariants}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Plus className="h-8 w-8" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{isOpen ? 'Close Menu' : 'New Entry'}</p>
            </TooltipContent>
          </Tooltip>

          {actionItems.map((item) => (
            <motion.div
              key={item.key}
              className="flex items-center gap-3"
              variants={itemVariants}
            >
              <div className="bg-card text-card-foreground text-sm font-semibold px-3 py-1.5 rounded-md shadow-md">
                {item.label}
              </div>
              <button
                onClick={() => handleActionClick(item.key)}
                className={cn(
                  'h-12 w-12 rounded-full flex items-center justify-center text-primary-foreground shadow-lg transition-transform active:scale-95',
                  item.color
                )}
                aria-label={`Submit new ${item.label}`}
              >
                <item.icon className="h-6 w-6" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
