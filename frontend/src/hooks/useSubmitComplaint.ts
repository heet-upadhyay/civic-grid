import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitComplaint } from '../api/complaints';
import type { SubmitComplaintRequest } from '../types/api';

export const useSubmitComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitComplaintRequest) => submitComplaint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
};
