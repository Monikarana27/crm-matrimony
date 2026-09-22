import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional().or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
  role: z.enum(
    [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES",
      "SALES_TL",
      "SALES_MANAGER",
      "PROFILE_CREATOR",
      "SERVICE",
      "SERVICE_TL",
      "SERVICE_MANAGER",
      "HR",
    ],
    { message: "Select a valid role" }
  ),
  department: z.enum(["SALES_EMP", "PROFILE_EMP", "SERVICE_EMP", "HR_EMP"]).optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;