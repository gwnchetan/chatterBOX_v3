import { QueryClient } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes (Data remains fresh for 5 mins)
            cacheTime: 1000 * 60 * 30, // 30 minutes (Inactive data kept in memory)
            refetchOnWindowFocus: false, // Don't refetch on window focus
            retry: 1, // Retry failed requests once
        },
    },
});
