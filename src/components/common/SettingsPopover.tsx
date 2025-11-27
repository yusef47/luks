/**
 * SettingsPopover Component
 * نافذة الإعدادات المنبثقة
 */

import React, { useRef, useEffect } from 'react';

interface SettingsPopoverProps {
  isOpen: boolean;
  cycleCount: number;
  setCycleCount: (count: number) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  isOpen,
  cycleCount,
  setCycleCount,
  onClose,
  t
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={popoverRef} 
      className="absolute bottom-full mb-3 right-0 rtl:right-auto rtl:left-0 w-64 card p-4 shadow-lg z-10"
    >
      <h4 className="font-bold text-sm mb-3">{t('settingsTitle')}</h4>
      
      {/* Cycle Count */}
      <div className="flex items-center justify-between">
        <label htmlFor="cycle-count" className="text-sm text-[var(--text-secondary-color)]">
          {t('cycleCount')}
        </label>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCycleCount(Math.max(1, cycleCount - 1))} 
            className="font-bold w-6 h-6 rounded-md bg-[var(--bg-tertiary-color)] hover:bg-[var(--hover-bg-color)] transition-colors"
          >
            -
          </button>
          <input 
            id="cycle-count" 
            type="number" 
            value={cycleCount} 
            readOnly 
            className="w-10 text-center bg-transparent" 
          />
          <button 
            onClick={() => setCycleCount(Math.min(5, cycleCount + 1))} 
            className="font-bold w-6 h-6 rounded-md bg-[var(--bg-tertiary-color)] hover:bg-[var(--hover-bg-color)] transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-[var(--text-secondary-color)] mt-3 opacity-70">
        Higher cycle count = more thorough analysis
      </p>
    </div>
  );
};

export default SettingsPopover;
