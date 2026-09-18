'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subMonths, addMonths, setMonth, getMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CalendarDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentViewDate: Date;
  setCurrentViewDate: (date: Date | ((prev: Date) => Date)) => void;
}

export const CalendarDatePickerModal: React.FC<CalendarDatePickerModalProps> = ({
  isOpen,
  onClose,
  currentViewDate,
  setCurrentViewDate,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[800] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[900] flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-[360px] pointer-events-auto"
            >
              <div className="bg-[#fffdf8] border border-[#e7e0d4] rounded-3xl shadow-xl overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-[#e7e0d4] flex items-center justify-between bg-[#f6f3ee]/60">
                  <h3 className="text-sm font-semibold text-[#1f2933]">
                    Pilih Bulan & Tahun
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-stone-200 text-stone-500 hover:text-stone-800 rounded-lg transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setCurrentViewDate((prev) => subMonths(prev, 12))}
                      className="p-2 hover:bg-[#f6f3ee] text-stone-600 hover:text-stone-900 rounded-xl transition-all border border-transparent hover:border-[#e7e0d4]"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-base font-bold text-[#1f2933]">
                      {format(currentViewDate, 'yyyy')}
                    </span>
                    <button
                      onClick={() => setCurrentViewDate((prev) => addMonths(prev, 12))}
                      className="p-2 hover:bg-[#f6f3ee] text-stone-600 hover:text-stone-900 rounded-xl transition-all border border-transparent hover:border-[#e7e0d4]"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const monthDate = setMonth(currentViewDate, i);
                      const isSelected = getMonth(currentViewDate) === i;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setCurrentViewDate(monthDate);
                            onClose();
                          }}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-[#f6f3ee] text-stone-700 border-[#e7e0d4] hover:border-stone-400 hover:text-stone-900'
                          }`}
                        >
                          {format(monthDate, 'MMM')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-[#f6f3ee]/60 border-t border-[#e7e0d4]">
                  <button
                    onClick={() => {
                      setCurrentViewDate(new Date());
                      onClose();
                    }}
                    className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-all border border-stone-300"
                  >
                    Kembali ke Hari Ini
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
