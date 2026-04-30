import process from "node:process";

export async function runWatchLoop(
  render: () => Promise<string>,
  options?: { intervalMs?: number; onChange?: (output: string) => Promise<void> | void }
): Promise<void> {
  const intervalMs = Math.max(250, options?.intervalMs ?? 1000);
  let lastOutput = "";
  let stopped = false;

  const stop = (): void => {
    stopped = true;
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  while (!stopped) {
    try {
      const output = await render();
      if (output !== lastOutput) {
        process.stdout.write(clearScreen());
        process.stdout.write(`${output}\n`);
        await options?.onChange?.(output);
        lastOutput = output;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const output = `track watch error: ${message}`;
      if (output !== lastOutput) {
        process.stdout.write(clearScreen());
        process.stdout.write(`${output}\n`);
        lastOutput = output;
      }
    }

    await sleep(intervalMs);
  }
}

function clearScreen(): string {
  return "\u001bc";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
