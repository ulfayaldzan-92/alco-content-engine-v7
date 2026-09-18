'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, X, Copy } from 'lucide-react';

const safeCopyToClipboard = async (text: string) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Clipboard write failed:', error);
    return false;
  }
};

interface CalendarRawOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawOutputData: { markdown: string; tab: string };
}

export const CalendarRawOutputModal: React.FC<CalendarRawOutputModalProps> = ({
  isOpen,
  onClose,
  rawOutputData,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[1100] flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-[960px] max-h-[90vh] pointer-events-auto flex flex-col"
            >
              <div className="bg-[#fffdf8] border border-[#e7e0d4] rounded-3xl shadow-xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-[#e7e0d4] flex items-center justify-between bg-[#f6f3ee]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary bg-primary/10 border border-primary/20">
                      <FileText size={16} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1f2933]">
                      Raw Output (Markdown & TAB)
                    </h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-stone-200 text-stone-500 hover:text-stone-800 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                        Markdown Table
                      </h4>
                      <button
                        onClick={() => {
                          void safeCopyToClipboard(rawOutputData.markdown);
                        }}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Copy size={12} /> Salin Tabel
                      </button>
                    </div>
                    <div className="bg-[#f6f3ee] rounded-2xl border border-[#e7e0d4] p-4 overflow-x-auto">
                      <pre className="text-xs font-mono text-stone-700 whitespace-pre leading-relaxed">
                        {rawOutputData.markdown}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                        TAB Separated (Untuk Spreadsheet / Excel)
                      </h4>
                      <button
                        onClick={() => {
                          void safeCopyToClipboard(rawOutputData.tab);
                        }}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Copy size={12} /> Salin Data TAB
                      </button>
                    </div>
                    <div className="bg-[#f6f3ee] rounded-2xl border border-[#e7e0d4] p-4 overflow-x-auto">
                      <pre className="text-xs font-mono text-stone-700 whitespace-pre leading-relaxed">
                        {rawOutputData.tab}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#f6f3ee]/60 border-t border-[#e7e0d4] text-center">
                  <p className="text-xs text-stone-500 italic">
                    * Tips: Gunakan format TAB di atas untuk langsung ditempel ke Google Sheets atau Excel tanpa merusak susunan kolom.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
