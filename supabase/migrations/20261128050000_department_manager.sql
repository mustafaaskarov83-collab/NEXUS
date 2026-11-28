-- Adds a department manager link for the HR module.
-- nexus_upsert_department and nexus_list_departments must be updated in Supabase
-- to read and write this column.

alter table hr.departments
  add column if not exists manager_employee_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'departments_manager_employee_fk'
      and conrelid = 'hr.departments'::regclass
  ) then
    alter table hr.departments
      add constraint departments_manager_employee_fk
      foreign key (manager_employee_id)
      references hr.employees(id)
      on delete set null;
  end if;
end
$$;
