import { useState, useEffect, useCallback } from "react";
import { getSearchIndex } from "@/lib/searchIndex";
import type { SearchResult } from "@/lib/searchIndex";

/**
 * Hook for search functionality
 */
export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Build index on mount
  useEffect(() => {
    const buildIndex = async () => {
      setIsIndexing(true);
      try {
        const index = getSearchIndex();
        await index.buildIndex();
      } catch (error) {
        // Silent error handling
      } finally {
        setIsIndexing(false);
      }
    };

    buildIndex();
  }, []);

  // Search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const index = getSearchIndex();
        const searchResults = await index.search(query);
        setResults(searchResults);
      } catch (error) {
        // Silent error handling
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Rebuild index
  const rebuildIndex = useCallback(async () => {
    setIsIndexing(true);
    try {
      const index = getSearchIndex();
      await index.buildIndex();
    } catch (error) {
      // Silent error handling
    } finally {
      setIsIndexing(false);
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    isIndexing,
    isSearching,
    rebuildIndex,
  };
}

