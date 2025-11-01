"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  itemName?: string;
}

/**
 * Confirmation modal for delete operations
 */
export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
}: DeleteConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="hud-panel p-6 max-w-md w-full"
        >
          <h2
            className="text-xl mono font-bold mb-3"
            style={{ color: "var(--text-heading)" }}
          >
            {title}
          </h2>
          
          <p
            className="text-sm console-text mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            {message}
          </p>
          
          {itemName && (
            <div
              className="px-3 py-2 mb-4 rounded border"
              style={{
                backgroundColor: "rgba(var(--accent-rgb), 0.1)",
                borderColor: "rgba(var(--accent-rgb), 0.3)",
                color: "var(--text-primary)",
              }}
            >
              {itemName}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="btn-neon-outline px-4 py-2 text-sm"
              style={{ touchAction: "manipulation" }}
            >
              CANCEL
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm mono uppercase tracking-wider"
              style={{
                touchAction: "manipulation",
                color: "#FF0040",
                border: "1px solid rgba(255, 0, 64, 0.4)",
                borderRadius: "var(--r)",
                backgroundColor: "rgba(255, 0, 64, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 0, 64, 0.6)";
                e.currentTarget.style.backgroundColor = "rgba(255, 0, 64, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 0, 64, 0.4)";
                e.currentTarget.style.backgroundColor = "rgba(255, 0, 64, 0.1)";
              }}
            >
              DELETE
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

