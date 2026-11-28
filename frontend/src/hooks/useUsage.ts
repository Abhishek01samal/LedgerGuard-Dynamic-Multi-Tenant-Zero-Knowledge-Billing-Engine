import { useQuery } from '@tanstack/react-query';
import { getUsageLimits } from '../services/analytics.service';

export function useUsage(currency = 'INR') {
  return useQuery({
    queryKey: ['usage', 'limits', currency],
    queryFn: () => getUsageLimits(currency),
  });
}
