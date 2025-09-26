"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface TypeaheadOption {
  key: string | number
  value: string
}

interface TypeaheadSelectProps {
  options: TypeaheadOption[]
  value?: string | number
  onValueChange: (value: string | number | undefined) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
  clearable?: boolean
  size?: "sm" | "default"
  name?: string
}

function TypeaheadSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Type to search...",
  className,
  disabled = false,
  clearable = true,
  size = "default",
  name,
}: TypeaheadSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  
  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    
    return options.filter(option =>
      option.value.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery])
  
  // Find selected option for display
  const selectedOption = React.useMemo(() => {
    if (value === undefined || value === null || value === '') return null
    return options.find(option => option.key === value) || null
  }, [options, value])
  
  // Reset search and highlighted index when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setHighlightedIndex(-1)
    }
  }, [open])
  
  // Focus input when dropdown opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const selectedOption = filteredOptions[highlightedIndex]
          onValueChange(selectedOption.key)
          setOpen(false)
        }
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        break
    }
  }
  
  // Handle option click
  const handleOptionClick = (option: TypeaheadOption) => {
    onValueChange(option.key)
    setOpen(false)
  }
  
  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange(undefined)
  }
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])
  
  return (
    <div className="relative" ref={listRef}>
      {/* Hidden input for form data */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value || ''}
        />
      )}
      
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "w-full justify-between text-left font-normal",
          size === "sm" ? "h-8" : "h-9",
          !selectedOption && "text-muted-foreground",
          className
        )}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.value : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {clearable && selectedOption && (
            <X
              className="h-4 w-4 opacity-50 hover:opacity-80"
              onClick={handleClear}
            />
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </Button>
      
      {/* Dropdown Content */}
      {open && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-popover border rounded-md shadow-md animate-in fade-in-0 zoom-in-95">
          {/* Search Input */}
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8"
            />
          </div>
          
          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No options found.
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option, index) => {
                  const isSelected = value === option.key
                  const isHighlighted = index === highlightedIndex
                  
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={cn(
                        "relative flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none cursor-pointer",
                        "hover:bg-accent hover:text-accent-foreground",
                        isHighlighted && "bg-accent text-accent-foreground",
                        isSelected && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handleOptionClick(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span className="flex-1 text-left truncate">
                        {option.value}
                      </span>
                      {isSelected && (
                        <Check className="ml-2 h-4 w-4 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { TypeaheadSelect }