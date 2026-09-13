import { useQuery } from '@tanstack/react-query';
import { getComplaintById } from '../api/complaints';

export const useComplaint = (id: string) => {
  return useQuery({
    queryKey: ['complaint', id],
    queryFn: () => getComplaintById(id),
    enabled: !!id,
  });
};
