"use client";

import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CustomImage } from '@/lib/customImageExtension';
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import type { Editor } from '@tiptap/react';

interface NoteEditorProps {
    initialContent: string;
    docKey?: string;
    onSave: (content: string) => void;
    onImagePaste: (file: File) => void;
}

export interface NoteEditorHandle {
    editor: Editor | null;
    insertImage: (imageId: string, imageUrl: string) => void;
}

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  ({ initialContent, docKey, onSave, onImagePaste }, ref) => {
    const [saving, setSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false);
    const lastSavedHtmlRef = useRef<string>("");
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitializedRef = useRef(false);

    const editor = useEditor({
        immediatelyRender: false, // Required for Next.js SSR
        extensions: [
            StarterKit,
            CustomImage.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'max-w-full h-auto rounded',
                },
            }),
            Table.configure({
                resizable: false,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Underline,
        ],
        content: initialContent || '<p></p>',
        editorProps: {
            attributes: {
                class: 'min-h-[400px] w-full focus:outline-none overflow-y-auto prose prose-invert max-w-none',
            },
            handlePaste: (_view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (const item of Array.from(items)) {
                    if (item.type.startsWith("image/")) {
                        event.preventDefault();
                        const file = item.getAsFile();
                        if (file) onImagePaste(file);
                        return true;
                    }
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            // Debounced save
            const html = editor.getHTML();
            if (html !== lastSavedHtmlRef.current) {
                setSaving(true);
                setTimeout(() => {
                    lastSavedHtmlRef.current = html;
                    onSave(html);
                    setSaving(false);
                    setShowSaved(true);
                    setTimeout(() => setShowSaved(false), 2000);
                }, 1000);
            }
        },
    }, [docKey]); // Recreate editor when docKey changes

    // Only update content on initial load or when docKey changes (switching sessions)
    useEffect(() => {
        if (editor && initialContent) {
            // Only set content if this is the first initialization or we switched sessions
            if (!isInitializedRef.current) {
                editor.commands.setContent(initialContent);
                lastSavedHtmlRef.current = initialContent;
                isInitializedRef.current = true;
            }
        }
    }, [editor, initialContent]);

    // Reset initialization flag when docKey changes (switching sessions)
    // biome-ignore lint/correctness/useExhaustiveDependencies: docKey change should reset initialization
    useEffect(() => {
        isInitializedRef.current = false;
    }, [docKey]);

    // Click handler to focus editor
    const handleContainerClick = useCallback(() => {
        if (editor && !editor.isFocused) {
            editor.commands.focus();
        }
    }, [editor]);

    // Expose editor and insertImage method via ref
    useImperativeHandle(ref, () => ({
        editor,
        insertImage: (imageId: string, imageUrl: string) => {
            if (editor) {
                // Insert image with both src and data-image-id
                editor.chain().focus().setImage({ 
                    src: imageUrl,
                    'data-image-id': imageId,
                } as any).run();
            }
        },
    }), [editor]);

    return (
        <div className="relative">
            {/* Title and status outside border */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="heading-2" style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", color: "rgb(150, 215, 225)" }}>
                    Notes
                </h2>
                <AnimatePresence>
                    {saving && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="console-text text-xs flex items-center gap-2"
                        >
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                            SAVING...
                        </motion.div>
                    )}
                    {showSaved && !saving && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="console-text text-xs flex items-center gap-2 text-cyan-400"
                        >
                            ✓ SAVED
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Editor container with border */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: Click to focus is intentional */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Click provides better UX for focusing editor */}
            <div
                ref={containerRef}
                onClick={handleContainerClick}
                className="hud-panel corner-hud p-6 cursor-text min-h-[450px] transition-all duration-200"
            >
                <EditorContent editor={editor} />
            </div>

            {/* Custom styles for Tiptap */}
            <style jsx global>{`
                .tiptap {
                    outline: none;
                    color: rgb(160, 220, 230);
                }
                
                .tiptap p {
                    margin: 0.5rem 0;
                    color: rgb(170, 225, 235);
                    line-height: 1.5;
                }
                
                .tiptap h1, .tiptap h2, .tiptap h3, .tiptap h4, .tiptap h5, .tiptap h6 {
                    font-family: var(--font-space-grotesk, sans-serif);
                    font-weight: 600;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                    color: rgb(150, 215, 225);
                }
                
                .tiptap h1 { font-size: 2rem; }
                .tiptap h2 { font-size: 1.5rem; }
                .tiptap h3 { font-size: 1.25rem; }
                
                .tiptap strong {
                    font-weight: 700;
                    color: rgb(140, 210, 220);
                }
                
                .tiptap em {
                    font-style: italic;
                }
                
                .tiptap u {
                    text-decoration: underline;
                }
                
                .tiptap code {
                    background-color: rgba(0, 245, 255, 0.2);
                    color: rgb(0, 245, 255);
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    font-family: 'IBM Plex Mono', monospace;
                    font-size: 0.875em;
                }
                
                .tiptap pre {
                    background-color: rgba(0, 245, 255, 0.1);
                    border: 1px solid rgba(0, 245, 255, 0.3);
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 1rem 0;
                    overflow-x: auto;
                }
                
                .tiptap pre code {
                    background: none;
                    padding: 0;
                    color: rgb(0, 245, 255);
                }
                
                .tiptap ul, .tiptap ol {
                    padding-left: 1.5rem;
                    margin: 0.5rem 0;
                }
                
                .tiptap ul {
                    list-style-type: disc;
                }
                
                .tiptap ol {
                    list-style-type: decimal;
                }
                
                .tiptap li {
                    margin: 0.15rem 0;
                    line-height: 1.4;
                    color: rgb(170, 225, 235);
                }
                
                .tiptap table {
                    border-collapse: collapse;
                    border: 1px solid rgba(0, 245, 255, 0.4);
                    margin: 1.5rem auto;
                    width: 100%;
                }
                
                .tiptap th, .tiptap td {
                    border: 1px solid rgba(0, 245, 255, 0.3);
                    padding: 0.75rem;
                    min-width: 70px;
                    text-align: left;
                    color: rgb(170, 225, 235);
                }
                
                .tiptap th {
                    background-color: rgba(0, 245, 255, 0.1);
                    font-weight: 600;
                    color: rgb(150, 215, 225);
                }
                
                .tiptap blockquote {
                    border-left: 3px solid rgba(0, 245, 255, 0.5);
                    padding-left: 1rem;
                    margin: 1rem 0;
                    color: rgb(180, 230, 240);
                }
                
                .tiptap hr {
                    border: none;
                    border-top: 1px solid rgba(0, 245, 255, 0.3);
                    margin: 2rem 0;
                }
                
                .tiptap p.is-editor-empty:first-child::before {
                    color: rgba(160, 220, 230, 0.5);
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                
                /* Cursor visibility */
                .tiptap {
                    caret-color: rgb(0, 245, 255);
                }
                
                .tiptap * {
                    caret-color: rgb(0, 245, 255);
                }
            `}</style>
        </div>
    );
  }
);

NoteEditor.displayName = "NoteEditor";
