import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlanFormValues {
  year: number;
  month: number;
  audit_type: string;
  product_process_name: string;
  department: string;
  planned_date: string;
  responsible_employee_id: string;
}

export function PlanModal({ existingPlan, onClose }: { existingPlan?: any; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!existingPlan;
  const queryClient = useQueryClient();

  const initialYear = Number(existingPlan?.year) || new Date().getFullYear();
  const initialMonth = Number(existingPlan?.month) || new Date().getMonth() + 1;
  const initialAuditType: string = String(existingPlan?.audit_type || 'Product Audit');
  const initialTitle: string = String(existingPlan?.product_process_name || existingPlan?.title || '');
  const initialDept: string = String(existingPlan?.department || existingPlan?.area || 'Quality Assurance');
  const initialDateStr = existingPlan?.planned_date ? (String(existingPlan.planned_date).split('T')[0] ?? '') : '';
  const fallbackDate = new Date().toISOString().split('T')[0] ?? '';
  const initialDate: string = initialDateStr ? initialDateStr : fallbackDate;
  const initialEmpId: string = String(existingPlan?.responsible_employee_id || existingPlan?.assigned_to_employee_number || '688079');

  const { register, handleSubmit, setValue, watch } = useForm<PlanFormValues>({
    defaultValues: {
      year: isEdit ? initialYear : new Date().getFullYear(),
      month: isEdit ? initialMonth : new Date().getMonth() + 1,
      audit_type: isEdit ? initialAuditType : 'Product Audit',
      product_process_name: isEdit ? initialTitle : '',
      department: isEdit ? initialDept : 'Quality Assurance',
      planned_date: isEdit ? initialDate : fallbackDate,
      responsible_employee_id: isEdit ? initialEmpId : '688079',
    },
  });


  const selectedAuditType = watch('audit_type');

  const mutation = useMutation({
    mutationFn: async (data: PlanFormValues) => {
      const year = Number(data.year);
      const month = Number(data.month);
      const title = (data.product_process_name || 'Audit Plan').trim();

      // Check duplicate within same month
      if (!isEdit && typeof window !== 'undefined') {
        const stored = localStorage.getItem('sakthi_excel_tasks_v8');
        const existingTasks = stored ? JSON.parse(stored) : [];
        const isDuplicate = existingTasks.some((t: any) => {
          const nameMatches =
            (t.title && String(t.title).trim().toUpperCase() === title.toUpperCase()) ||
            (t.audit_code && String(t.audit_code).trim().toUpperCase() === title.toUpperCase());
          return nameMatches && Number(t.month || 1) === month && Number(t.year || new Date().getFullYear()) === year;
        });

        if (isDuplicate) {
          throw new Error(`Plan for '${title}' is already scheduled for Month ${month}/${year}! Duplicate plan in the same month is restricted.`);
        }
      }

      const plannedDate = data.planned_date || `${year}-${String(month).padStart(2, '0')}-01`;
      
      const payload = {
        title: data.product_process_name || 'Audit Plan',
        area: data.department || 'Quality Assurance',
        audit_type: data.audit_type as any,
        year: year,
        frequency: 'Monthly',
      };

      let planId = existingPlan?.id || existingPlan?.plan_id;

      if (isEdit && planId) {
        const { error } = await (supabase.from('audit_plans') as any)
          .update(payload)
          .eq('id', planId);
        if (error) console.warn('Supabase audit_plans update notice:', error);
      } else {
        const { data: inserted, error } = await (supabase.from('audit_plans') as any)
          .insert(payload)
          .select()
          .maybeSingle();
        if (error) console.warn('Supabase audit_plans insert notice:', error);
        if (inserted?.id) planId = inserted.id;
      }

      // Also create an audit assignment task record so it reflects across all dashboard plan views
      const auditCode = existingPlan?.audit_code || `AUD-PLAN-${Date.now().toString().slice(-4)}`;
      const empNum = data.responsible_employee_id || '688079';
      
      const taskRecord = {
        id: planId || `aud-plan-${Date.now()}`,
        sl_no: 1,
        audit_code: auditCode,
        title: data.product_process_name || 'Audit Plan',
        audit_type: data.audit_type,
        area: data.department || 'Quality Assurance',
        month: month,
        year: year,
        due_date: plannedDate,
        status: 'Planned',
        assigned_to_employee_number: empNum,
        auditor_name: empNum === '688079' ? 'SILAMBARASAN S' : `Auditor (${empNum})`,
        department: data.department || 'Quality Assurance',
        product_process_name: data.product_process_name,
        planned_date: plannedDate,
        responsible_employee_id: empNum,
      };

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sakthi_excel_tasks_v8');
        let tasks = stored ? JSON.parse(stored) : [];
        tasks = tasks.filter((t: any) => t.id !== taskRecord.id && t.audit_code !== taskRecord.audit_code);
        tasks.unshift(taskRecord);
        localStorage.setItem('sakthi_excel_tasks_v8', JSON.stringify(tasks));
        window.dispatchEvent(new Event('excel_tasks_updated'));
      }

      try {
        await (supabase.from('audit_assignments') as any).upsert({
          audit_code: auditCode,
          title: data.product_process_name || 'Audit Plan',
          audit_type: data.audit_type as any,
          area: data.department || 'Quality Assurance',
          month: month,
          year: year,
          due_date: plannedDate,
          assigned_to_employee_number: empNum,
          status: 'Planned' as any,
        }, { onConflict: 'audit_code' });
      } catch (e) {
        console.warn('Assignment sync notice:', e);
      }

      return taskRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditPlans'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success(isEdit ? 'Annual Plan updated successfully' : 'Annual Plan created successfully');
      setOpen(false);
      if (onClose) onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error saving plan');
    },
  });

  const onSubmit = (data: PlanFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? "outline" : "default"}>{isEdit ? 'Edit Plan' : '+ Add Plan'}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px] bg-white">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Annual Plan' : 'Create New Annual Plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 pt-2">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Year</label>
              <Input type="number" {...register('year', { required: true, valueAsNumber: true })} placeholder="Year" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Month (1-12)</label>
              <Input type="number" {...register('month', { required: true, min: 1, max: 12, valueAsNumber: true })} placeholder="Month" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Audit Type</label>
            <select
              value={selectedAuditType}
              onChange={(e) => setValue('audit_type', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="Product Audit">Product Audit</option>
              <option value="Revalidation Audit">Revalidation Audit</option>
              <option value="Document Audit">Document Audit</option>
              <option value="Dock Audit">Dock Audit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Customer Name</label>
            <select
              {...register('customer_name' as any)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-bold"
            >
              <option value="GENERAL MOTORS">GENERAL MOTORS</option>
              <option value="MARUTI SUZUKI INDIA LIMITED">MARUTI SUZUKI INDIA LIMITED</option>
              <option value="ASHOK LEYLAND">ASHOK LEYLAND</option>
              <option value="FIAT CHRYSLER AUTOMOBILES">FIAT CHRYSLER AUTOMOBILES</option>
              <option value="FORD INDIA PRIVATE LIMITED">FORD INDIA PRIVATE LIMITED</option>
              <option value="GENERAL MOTORS INDIA">GENERAL MOTORS INDIA</option>
              <option value="HONDA SIEL CARS INDIA LIMITED">HONDA SIEL CARS INDIA LIMITED</option>
              <option value="JTEKT INDIA LTD">JTEKT INDIA LTD</option>
              <option value="MAHINDRA & MAHINDRA LTD">MAHINDRA & MAHINDRA LTD</option>
              <option value="PEUGEOT CITROEN">PEUGEOT CITROEN</option>
              <option value="RENAULT NISSAN">RENAULT NISSAN</option>
              <option value="STELLANTIES">STELLANTIES</option>
              <option value="UD TRUCKS">UD TRUCKS</option>
              <option value="VOLKSWAGEN">VOLKSWAGEN</option>
              <option value="VOLVO GROUP">VOLVO GROUP</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Product / Process Name</label>
            <Input {...register('product_process_name', { required: true })} placeholder="e.g. Steering Knuckle Assembly" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Department / Line</label>
            <Input {...register('department', { required: true })} placeholder="e.g. Quality Assurance / Line 1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Planned Date</label>
              <Input type="date" {...register('planned_date', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Responsible Emp ID</label>
              <select
                {...register('responsible_employee_id', { required: true })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="688079">688079 - SILAMBARASAN S</option>
                <option value="663875">663875 - VENKADESH D</option>
                <option value="710250">710250 - MOUNIKASRI A</option>
                <option value="666468">666468 - KAVIN KUMAR K</option>
                <option value="665773">665773 - KARTHEEBAN K</option>
                <option value="665965">665965 - DINESHKUMAR A B</option>
                <option value="708818">708818 - SELVAKUMAR J</option>
                <option value="667685">667685 - GEETHA S</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {mutation.isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Plan')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



