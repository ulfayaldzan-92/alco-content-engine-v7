'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Layers, Trash2, X } from 'lucide-react';

interface CalendarHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: any[];
  onClearHistory: () => void;
  onDeleteHistory: (id: number) => void;
  onLoadHistory: (entry: any) => void;
}

export const CalendarHistoryModal: React.FC<CalendarHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onDeleteHistory,
  onLoadHistory,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[700] flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-[480px] pointer-events-auto"
            >
              <div className="bg-[#fffdf8] border border-[#e7e0d4] rounded-3xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
                <div className="p-5 border-b border-[#e7e0d4] flex items-center justify-between bg-[#f6f3ee]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary bg-primary/10 border border-primary/20">
                      <Layers size={16} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1f2933]">
                      Histori Generate Kalender
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {history.length > 0 && (
                      <button
                        onClick={onClearHistory}
                        className="p-1.5 hover:bg-rose-50 text-stone-500 hover:text-rose-600 rounded-lg transition-all"
                        title="Hapus Semua Histori"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="p-1.5 hover:bg-stone-200 text-stone-500 hover:text-stone-800 rounded-lg transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto p-5 space-y-3 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <Layers size={32} className="mx-auto text-stone-300" />
                      <p className="text-xs text-stone-500">
                        Belum ada riwayat generate
                      </p>
                    </div>
                  ) : (
                    history.map((entry: any) => (
                      <div
                        key={entry.id}
                        className="p-4 bg-[#f6f3ee]/50 border border-[#e7e0d4] rounded-2xl hover:border-primary/40 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-stone-500">
                              {format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm')}
                            </span>
                            {entry.itemCount !== undefined && (
                              <span className="text-xs text-primary font-semibold mt-0.5">
                                {entry.itemCount} Konten Tergenerate
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => onDeleteHistory(entry.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 transition-all"
                            title="Hapus riwayat ini"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-[#1f2933] line-clamp-2 mb-3">
                          {entry.topic}
                        </p>
                        <button
                          onClick={() => {
                            onLoadHistory(entry);
                            onClose();
                          }}
                          className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-semibold transition-all border border-primary/20"
                        >
                          Muat Data ke Kalender
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
