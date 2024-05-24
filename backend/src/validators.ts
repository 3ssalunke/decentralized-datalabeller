import z from "zod";

export const signinInput = z.object({
  message: z.array(z.number()),
  signature: z.array(z.number()),
  publicKey: z.string(),
});

export const createTaskInput = z.object({
  options: z
    .array(
      z.object({
        imageUrl: z.string(),
      })
    )
    .min(2),
  title: z.string(),
  signature: z.string(),
});

export const createSubmissionInput = z.object({
  taskId: z.number(),
  selection: z.number(),
});

export const payoutInput = z.object({
  payout: z.number(),
});
