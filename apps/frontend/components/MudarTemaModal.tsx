"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef } from "react";

export function ThemeModal({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (isOpen: boolean) => void }) {
    const { theme, setTheme } = useTheme()
    const ref = useRef<HTMLDivElement>(null)
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    return (
        <div ref={ref} className={`absolute top-12 w-48 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-lg shadow-lg p-4 ${isOpen ? 'block' : 'hidden'}`}>
            <h3 className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">Escolha o tema</h3>
            <ul>
                <li className={`cursor-pointer px-2 py-1 rounded text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-primary/20 dark:hover:bg-vaks-dark-primary/60`} onClick={() => setTheme('light')}>Claro</li>
                <li className={`cursor-pointer px-2 py-1 rounded text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-primary/20 dark:hover:bg-vaks-dark-primary/60`} onClick={() => setTheme('dark')}>Escuro</li>
            </ul>
        </div>
    );
}