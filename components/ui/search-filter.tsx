"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "./input"
import { cn } from "@/lib/utils"

interface SearchFilterProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilter: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchFilter({
  onFilter,
  placeholder = "Buscar...",
  className,
  ...props
}: SearchFilterProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        onChange={(e) => onFilter(e.target.value)}
        className="pl-8"
        {...props}
      />
    </div>
  )
}
