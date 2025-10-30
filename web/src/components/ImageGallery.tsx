"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { getImageUrl, type Image } from "@/lib/db";

interface ImageGalleryProps {
  images: Image[];
  onDelete?: (id: string) => Promise<void> | void;
}

export function ImageGallery({ images, onDelete }: ImageGalleryProps) {
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const objectUrlsRef = useRef<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadImageUrls = async () => {
      const urls = new Map<string, string>();
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];

      for (const image of images) {
        try {
          const url = await getImageUrl(image);
          urls.set(image.id, url);
          objectUrlsRef.current.push(url);
        } catch (error) {
          console.error("Failed to load image URL:", error);
        }
      }
      if (!cancelled) setImageUrls(urls);
    };

    loadImageUrls();

    return () => {
      cancelled = true;
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, [images]);

  useEffect(() => {
    if (!modalOpen) return;

    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [modalOpen]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        {images.map((image, index) => {
          const url = imageUrls.get(image.id);
          if (!url) return null;

          return (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: index * 0.05,
                duration: 0.2,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              className="relative group hover-lock flex-shrink-0 cursor-pointer"
              style={{
                width: "120px",
                height: "80px",
                borderRadius: "var(--r)",
                border: "1px solid rgba(var(--accent-rgb), 0.3)",
                background: "rgba(15, 15, 15, 0.6)",
                boxShadow: "inset 0 0 8px rgba(var(--accent-rgb), 0.08)",
                overflow: "hidden",
              }}
              onClick={() => {
                setModalOpen(true);
                setModalImage(url);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />

              {/* Delete button */}
              {onDelete && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await onDelete(image.id);
                    } catch (err) {
                      console.error("Failed to delete image", err);
                    }
                  }}
                  title="Delete screenshot"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/80 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                >
                  ×
                </button>
              )}

              {/* Edge glow on hover */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  border: "1px solid rgba(var(--accent-rgb), 0.6)",
                  borderRadius: "var(--r)",
                  boxShadow: "inset 0 0 12px rgba(var(--accent-rgb), 0.15)",
                }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Modal for full-screen viewing */}
      <AnimatePresence>
        {modalOpen && modalImage && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={() => setModalOpen(false)}
          >
            <motion.img
              src={modalImage}
              alt="Full screen screenshot"
              className="max-h-[80vh] max-w-[90vw]"
              style={{
                borderRadius: "var(--r-lg)",
                border: "1px solid rgba(var(--accent-rgb), 0.4)",
                boxShadow: "inset 0 0 20px rgba(var(--accent-rgb), 0.15)",
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Close button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-6 right-6 text-white text-2xl bg-black/60 rounded-full w-10 h-10 flex items-center justify-center border border-white/20 hover:border-white/40 transition-all"
              style={{
                borderRadius: "var(--r)",
                boxShadow: "inset 0 0 8px rgba(255, 255, 255, 0.08)",
              }}
              aria-label="Close"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
