import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { WORKER_JWT_SECRET } from "../config";
import { authMiddleware } from "../middlewares";
import { getWorkerNextTask } from "../repo";
import { createSubmissionInput, payoutInput, signinInput } from "../validators";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

const MAX_SUBMISSIONS_PER_WORKER = 100;

export default function (
  prismaClient: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>
) {
  const router = Router();

  router.post(
    "/payout",
    authMiddleware(prismaClient, "worker"),
    async (req, res) => {
      // @ts-ignore
      const worker = req.worker;
      const inputs = req.body;

      const parsedInputs = payoutInput.safeParse(inputs);
      if (!parsedInputs.success) {
        return res.status(411).json({
          message: "you have sent wrong inputs",
        });
      }

      const payoutAmount = parsedInputs.data.payout;
      const txnId = "0x57595375357";

      const payout = await prismaClient.$transaction(async (txn) => {
        await txn.balance.update({
          where: {
            worker_id: worker.id,
          },
          data: {
            pending_amount: {
              decrement: payoutAmount,
            },
            locked_amount: {
              increment: payoutAmount,
            },
          },
        });

        return await txn.payout.create({
          data: {
            amount: payoutAmount,
            signature: txnId,
            status: "Processing",
            worker_id: worker.id,
          },
        });
      });

      return res.json({
        payout,
      });
    }
  );

  router.get(
    "/balance",
    authMiddleware(prismaClient, "worker"),
    async (req, res) => {
      //@ts-ignore
      const worker = req.worker;

      const balance = await prismaClient.balance.findFirst({
        where: {
          worker_id: worker.id,
        },
      });

      return res.json({
        pendingAmount: balance?.pending_amount,
        lockedAmount: balance?.locked_amount,
      });
    }
  );

  router.post(
    "/submission",
    authMiddleware(prismaClient, "worker"),
    async (req, res) => {
      //@ts-ignore
      const worker = req.worker;
      const inputs = req.body;

      const parsedInputs = createSubmissionInput.safeParse(inputs);
      if (!parsedInputs.success) {
        return res.status(411).json({
          message: "you have sent wrong inputs",
        });
      }

      const task = await getWorkerNextTask(prismaClient, worker.id);
      if (!task || task.id !== parsedInputs.data.taskId) {
        return res.status(411).json({
          message: "incorrect task id",
        });
      }

      const submission = await prismaClient.$transaction(async (txn) => {
        const submission = await txn.submission.create({
          data: {
            option_id: parsedInputs.data.selection,
            amount: task.payment / MAX_SUBMISSIONS_PER_WORKER,
            worker_id: worker.id,
            task_id: task.id,
          },
        });

        await txn.balance.upsert({
          where: {
            worker_id: worker.id,
          },
          update: {
            pending_amount: {
              increment: submission.amount,
            },
          },
          create: {
            worker_id: worker.id,
            pending_amount: submission.amount,
            locked_amount: 0,
          },
        });

        return submission;
      });

      const nextTask = await getWorkerNextTask(prismaClient, worker.id);

      return res.json({
        nextTask,
        amount: submission.amount,
      });
    }
  );

  router.get(
    "/nextTask",
    authMiddleware(prismaClient, "worker"),
    async (req, res) => {
      //@ts-ignore
      const worker = req.worker;

      const task = await getWorkerNextTask(prismaClient, worker.id);

      if (!task) {
        return res.status(411).json({
          message: "no more tasks left for you",
        });
      }

      return res.json({
        task,
      });
    }
  );

  router.post("/signin", async (req, res) => {
    const inputs = req.body;
    const parsedInputs = signinInput.safeParse(inputs);
    if (!parsedInputs.success) {
      return res.status(411).json({
        message: "you have sent wrong inputs",
        error: parsedInputs.error,
      });
    }

    const { message, signature, publicKey } = parsedInputs.data;
    const _message = Uint8Array.from(message);
    const _signature = Uint8Array.from(signature);
    const _publicKey = new PublicKey(publicKey).toBytes();

    const result = nacl.sign.detached.verify(_message, _signature, _publicKey);
    if (!result) {
      return res.status(411).json({
        message: "incorrect signature",
      });
    }

    const exitstingWorker = await prismaClient.worker.findFirst({
      where: {
        address: publicKey,
      },
      include: {
        Balance: true,
      },
    });
    if (exitstingWorker) {
      const token = jwt.sign(
        {
          workerId: exitstingWorker.id,
        },
        WORKER_JWT_SECRET
      );

      return res.json({
        token,
        amount: exitstingWorker.Balance?.pending_amount ?? 0,
      });
    } else {
      const worker = await prismaClient.$transaction(async (txn) => {
        const worker = await txn.worker.create({
          data: {
            address: publicKey,
            name: "testworker",
          },
        });

        await txn.balance.create({
          data: {
            worker_id: worker.id,
            locked_amount: 0,
            pending_amount: 0,
          },
        });

        return worker;
      });

      const token = jwt.sign(
        {
          workerId: worker.id,
        },
        WORKER_JWT_SECRET
      );

      return res.json({ token, amount: 0 });
    }
  });

  return router;
}
