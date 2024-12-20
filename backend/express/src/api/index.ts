import { Router, Request, Response } from "express";
import MessageResponse from "../interfaces/MessageResponse";
import { invokeModel } from "./bedrock";

const router = Router();

interface PromptRequest {
  prompt: string;
  modelId: number;
}

router.get(
  "/messages/:id",
  (req: Request<{ id: string }>, res: Response<{ message: string }>) => {
    const userId = req.params.id;
  }
);

router.post(
  "/invoke",
  async (
    req: Request<{}, {}, { prompt: string; modelId: number }>,
    res: Response
  ) => {
    const { prompt, modelId } = req.body;

    res.setHeader("Content-Type", "text/plain"); // Adjust content type as needed

    // Create a promise to handle the end of streaming
    const streamPromise = new Promise((resolve, reject) => {
      const onChunkReceived = (chunk: string) => {
        res.write(chunk); // Stream chunk to the client
      };

      invokeModel(prompt, modelId, onChunkReceived)
        .then(() => {
          res.end();
        })
        .catch((error) => {
          console.error("Error invoking model:", error);
          reject("Error invoking model");
        });
    });

    // Wait for the streaming to complete before ending the response
    try {
      await streamPromise;
      res.end(); // Signal end of streaming
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).send(error);
      } else {
        res.end();
      }
    }

    // Ensure the response ends if the client disconnects
    req.on("close", () => {
      console.log("Client disconnected before completing the response.");
      res.end();
    });
  }
);

export default router;
