import { useQuery } from '@tanstack/react-query';
import { getComplaints } from '../api/complaints';

export const useComplaints = () => {
  return useQuery({
    queryKey: ['complaints'],
    queryFn: getComplaints,
  });
};
