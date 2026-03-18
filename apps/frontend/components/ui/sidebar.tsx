"use client"

import Link, { LinkProps } from "next/link"
import React, { useState, createContext, useContext } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/utils/styling/cn"
import { usePathname } from "next/navigation"

interface SidebarLinkData {
  label: string
  href: string
  icon: React.ReactNode
}

interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  const [openState, setOpenState] = useState(false)
  const open = openProp !== undefined ? openProp : openState
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  )
}

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  )
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar()
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col shrink-0 relative",
        "bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover",
        "border-r border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/40",
        className,
      )}
      animate={{
        width: animate ? (open ? "280px" : "68px") : "280px",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      {...props}
    >
      {children as React.ReactNode}
      {/* Chevron toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-vaks-white flex items-center justify-center shadow-md hover:scale-110 transition-transform z-50"
      >
        {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </motion.div>
  )
}

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar()
  return (
    <>
      <div
        className={cn(
          "h-14 px-4 py-4 flex flex-row md:hidden items-center justify-between w-full",
          "bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card",
          "border-b border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/40",
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-vaks-light-main-txt dark:text-vaks-dark-main-txt cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn(
                "fixed h-full w-full inset-0 p-10 z-100 flex flex-col justify-between",
                "bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card",
                className,
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-vaks-light-main-txt dark:text-vaks-dark-main-txt cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export const SidebarLinkItem = ({
  link,
  className,
  ...props
}: {
  link: SidebarLinkData;
  className?: string;
} & Omit<LinkProps, "href">) => {
  const { open, animate } = useSidebar();
  const pathname = usePathname();

  const isActive = pathname === link.href;

  return (
    <Link
      href={link.href}
      className={cn(
        "relative flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-lg transition-colors duration-200",
        isActive
          ? "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-vaks-white"
          : "text-vaks-light-main-txt/80 dark:text-vaks-dark-main-txt/80 hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-card-hover hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary",
        className
      )}
      {...props}
    >
      <span className={cn("relative z-10 flex-shrink-0", isActive ? "text-vaks-white" : "text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt")}>{link.icon}</span>

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className={cn(
          "text-sm font-medium whitespace-pre transition-transform duration-150 p-0! m-0!",
          !isActive && "group-hover/sidebar:translate-x-1"
        )}
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

export const SidebarDropdown = ({
  label,
  icon,
  links,
  className,
}: {
  label: string
  icon: React.ReactNode
  links: SidebarLinkData[]
  className?: string
}) => {
  const { open, animate } = useSidebar()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={className}>
      {/* Trigger */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center justify-start gap-3 w-full group/sidebar py-2.5 px-3 rounded-lg transition-colors duration-200",
          "text-vaks-light-main-txt/80 dark:text-vaks-dark-main-txt/80",
          "hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-card-hover",
          "hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary",
        )}
      >
        {icon}
        <motion.span
          animate={{
            display: animate ? (open ? "inline-block" : "none") : "inline-block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          className="text-sm font-medium whitespace-pre flex-1 text-left p-0! m-0!"
        >
          {label}
        </motion.span>
        {open && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
          </motion.div>
        )}
      </button>

      {/* Dropdown items */}
      <AnimatePresence>
        {expanded && open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-5 pl-3 border-l border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/40 flex flex-col gap-0.5 mt-1">
              {links.map((link, idx) => (
                <SidebarLinkItem key={idx} link={link} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}