import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface PlanFormValues {
  year: number;
  month: number;
  audit_type: string;
  product_process_name: string;
  department: string;
  planned_date: string; // ISO date string
  responsible_employee_id: string;
}

export function PlanModal({ existingPlan, onClose }: { existingPlan?: any; onClose?: () => void }) {
  const isEdit = !!existingPlan;
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PlanFormValues>({
    defaultValues: isEdit ? {
      year: new Date(existingPlan.planned_date).getFullYear(),
      month: new Date(existingPlan.planned_date).getMonth() + 1,
      audit_type: existingPlan.audit_type,
      product_process_name: existingPlan.product_process_name,
      department: existingPlan.department,
      planned_date: existingPlan.planned_date.split('T')[0],
      responsible_employee_id: existingPlan.responsible_employee_id,
    } : {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      audit_type: '',
      product_process_name: '',
      department: '',
      planned_date: '',
      responsible_employee_id: '',
    }
  });

  const mutation = useMutation(
    async (data: PlanFormValues) => {
      const payload = {
        year: data.year,
        month: data.month,
        audit_type: data.audit_type,
        product_process_name: data.product_process_name,
        department: data.department,
        planned_date: data.planned_date,
        responsible_employee_id: data.responsible_employee_id,
      };
      if (isEdit) {
        const { error } = await supabase
          .from('audit_plans')
          .update(payload)
          .eq('plan_id', existingPlan.plan_id);
        if (error) throw error;
        return payload;
      } else {
        const { error } = await supabase.from('audit_plans').insert(payload);
        if (error) throw error;
        return payload;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['auditPlans']);
        toast({ description: isEdit ? 'Plan updated' : 'Plan created' });
        if (onClose) onClose();
      },
      onError: (err: any) => {
        toast({ variant: 'destructive', description: err.message || 'Error saving plan' });
      },
    }
  );

  const onSubmit = (data: PlanFormValues) => {
    if (data.planned_date) {
      const plannedYear = new Date(data.planned_date).getFullYear();
      if (plannedYear !== data.year) {
        toast({ variant: 'destructive', description: 'Planned date must fall within the selected year.' });
        return;
      }
    }
    mutation.mutate(data);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{isEdit ? 'Edit Plan' : 'Add Plan'}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Annual Plan' : 'Create New Annual Plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" {...register('year', { required: true })} placeholder="Year" />
            <Input type="number" {...register('month', { required: true, min: 1, max: 12 })} placeholder="Month" />
          </div>
          <Select {...register('audit_type', { required: true })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Audit Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Product Audit">Product Audit</SelectItem>
              <SelectItem value="Revalidation Audit">Revalidation Audit</SelectItem>
              <SelectItem value="Document Audit">Document Audit</SelectItem>
            </SelectContent>
          </Select>
          <Input {...register('product_process_name', { required: true })} placeholder="Product / Process Name" />
          <Input {...register('department', { required: true })} placeholder="Department" />
          <Input type="date" {...register('planned_date', { required: true })} />
          <Input {...register('responsible_employee_id', { required: true })} placeholder="Responsible Employee ID" />
          <DialogFooter>
            <Button type="submit" disabled={mutation.isLoading}>
              {isEdit ? 'Save Changes' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
