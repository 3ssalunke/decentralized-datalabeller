import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { USER_JWT_SECRET, WORKER_JWT_SECRET } from "./config";

export function authMiddleware(
  prismaClient: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  authFor: "user" | "worker" = "user"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"] || "";
    if (!authHeader) {
      return res.status(401).json({
        message: "authorization token is missing",
      });
    }

    try {
      if (authFor === "worker") {
        const decoded = jwt.verify(authHeader, WORKER_JWT_SECRET) as {
          workerId: number;
        };
        if (decoded.workerId) {
          // @ts-ignore
          const worker = await prismaClient.worker.findFirst({
            where: {
              id: decoded.workerId,
            },
          });
          if (!worker) {
            return res.status(401).json({
              message: "invalid authorization token",
            });
          }
          // @ts-ignore
          req.worker = worker;
          next();
        } else {
          return res.status(401).json({
            message: "you are not logged in",
          });
        }
      } else {
        const decoded = jwt.verify(authHeader, USER_JWT_SECRET) as {
          userId: number;
        };
        if (decoded.userId) {
          // @ts-ignore
          const user = await prismaClient.user.findFirst({
            where: {
              id: decoded.userId,
            },
          });
          if (!user) {
            return res.status(401).json({
              message: "invalid authorization token",
            });
          }
          // @ts-ignore
          req.user = user;
          next();
        } else {
          return res.status(401).json({
            message: "you are not logged in",
          });
        }
      }
    } catch (error) {
      console.error(error);
      return res.status(401).json({
        message: "you are not logged in",
      });
    }
  };
}
