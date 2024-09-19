import Fastify from "fastify";
import { spawn } from "child_process";

const { ADDRESS = 'localhost', PORT = '3000' } = process.env;

const fastify = Fastify({
  logger: true,
});

const lintSchema = {
  body: {
    type: "object",
    required: ["text"],
    properties: {
      text: { type: "string" },
    },
  },
};

const runVale = async (text) => {
  return new Promise((resolve, reject) => {
    const vale = spawn("vale", ["--output=JSON", text]);

    let output = "";
    let errorOutput = "";

    vale.stdout.on("data", (data) => {
      output += data.toString();
    });

    vale.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    vale.on("close", (code) => {
      try {
        const jsonResponse = JSON.parse(output);
        resolve(jsonResponse);
      } catch (err) {
        reject(new Error("Failed to parse JSON output"));
      }
    });

    vale.on("error", (err) => {
      reject(err);
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
    fastify.log.info("Server closed successfully.");
    process.exit(0);
  } catch (err) {
    fastify.log.error("Error closing server:", err);
    process.exit(1);
  }
});
