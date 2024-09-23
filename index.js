import Fastify from "fastify";
import { Worker } from "worker_threads";

const { ADDRESS = 'localhost', PORT = '3000' } = process.env;

const fastify = Fastify({
  logger: true,
});
await fastify.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
})

const lintSchema = {
  body: {
    type: "object",
    required: ["text"],
    properties: {
      text: { type: "string" },
    },
  },
};

const activeWorkers = new Set();

const runVale = async (text) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./valeWorker.js", {
      workerData: { text },
    });

    activeWorkers.add(worker);

    worker.on("message", (result) => {
      activeWorkers.delete(worker);
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result);
      }
    });

    worker.on("error", (err) => {
      activeWorkers.delete(worker);
      reject(err);
    });

    worker.on("exit", (code) => {
      activeWorkers.delete(worker);
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
};

fastify.route({
  method: "POST",
  url: "/lint",
  schema: lintSchema,
  preHandler: async (request, reply) => {
    try {
      request.valeResult = await runVale(request.body.text);
    } catch (err) {
      reply.code(500).send({ error: err.message });
    }
  },
  handler: async (request, reply) => {
    reply.code(200).send(request.valeResult);
  },
});

fastify.route({
  method: "GET",
  url: "/",
  handler: async (request, reply) => {
    reply.code(200).send("Use POST /lint to lint your text.");
  },
});

const startServer = async () => {
  try {
    await fastify.listen({ host: ADDRESS, port: parseInt(PORT, 10) });
    fastify.log.info(`server listening on ${ADDRESS}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();

process.on("SIGINT", async () => {
  fastify.log.info("SIGINT received. Gracefully shutting down...");
  try {
    await fastify.close();
    for (const worker of activeWorkers) {
      worker.terminate();
    }
    fastify.log.info("Server closed successfully.");
    process.exit(0);
  } catch (err) {
    fastify.log.error("Error closing server:", err);
    process.exit(1);
  }
});
