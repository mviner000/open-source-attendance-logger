import React from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from 'lucide-react'

interface SearchBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  handleClearSearch: () => void
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery, handleClearSearch }) => {
  return (
    <div className="mb-4 relative p-4 bg-[#2F4A34] rounded-lg hidden">
        <Input
          className="text-white"
          placeholderClassName="placeholder:text-white"
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      {searchQuery && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
          onClick={handleClearSearch}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export default SearchBar

