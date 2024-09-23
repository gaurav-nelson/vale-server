import { workerData, parentPort } from "worker_threads";
import { spawn } from "child_process";

const runVale = (text) => {
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

runVale(workerData.text)
  .then((result) => parentPort.postMessage(result))
  .catch((err) => parentPort.postMessage({ error: err.message }));
