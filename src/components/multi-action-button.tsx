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

  const parentVariants = {
    closed: {
      transition: {
        staggerChildren: 0.1,
        staggerDirection: -1,
      },
    },
    open: {
      transition: {
        staggerChildren: 0.2,
        staggerDirection: 1,
      },
    },
  };

  const childVariants = {
    closed: {
      opacity: 0,
      y: 20,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      },
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      },
    },
  };

  return (
    <TooltipProvider>
      <div className="fixed bottom-24 right-6 md:right-8 z-40">
        <motion.div
          className="flex flex-col items-center gap-4"
          variants={parentVariants}
          animate={isOpen ? 'open' : 'closed'}
          initial="closed"
        >
          <AnimatePresence>
            {isOpen &&
              actionItems.map((item) => (
                <motion.div
                  key={item.key}
                  className="flex items-center gap-3"
                  variants={childVariants}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <div className="bg-card text-card-foreground text-sm font-semibold px-3 py-1.5 rounded-md shadow-md">
                    {item.label}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>New {item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}
          </AnimatePresence>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="h-16 w-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform active:scale-95"
                aria-label="Toggle Actions Menu"
                aria-expanded={isOpen}
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Plus className="h-8 w-8" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{isOpen ? 'Close Menu' : 'New Entry'}</p>
            </TooltipContent>
          </Tooltip>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
