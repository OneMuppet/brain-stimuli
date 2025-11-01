"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ExportButtonProps {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

export function ExportButton({ onClick, disabled }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleClick = async () => {
    if (disabled || exporting) return;
    
    setExporting(true);
    try {
      await onClick();
    } catch (error) {
      // Silent error handling
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || exporting}
      className="btn-neon-outline hover-lock text-sm"
      style={{ touchAction: "manipulation" }}
    >
      {exporting ? "EXPORTING..." : "EXPORT PDF"}
    </button>
  );
}

