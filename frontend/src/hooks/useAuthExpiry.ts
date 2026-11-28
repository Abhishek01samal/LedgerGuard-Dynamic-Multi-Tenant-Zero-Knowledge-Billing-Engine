import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '../services/auth.service';
import { isUnauthorized } from '../services/api';

export function useAuthExpiry(enabled: boolean, onExpired: () => void) {
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    enabled,
    refetchInterval: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.error && isUnauthorized(query.error)) onExpired();
  }, [query.error, onExpired]);

  return query;
}
