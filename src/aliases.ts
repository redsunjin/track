export function expandCommandAliases(args: string[]): string[] {
  if (args[0] === "watch") {
    return ["status", "--watch", ...args.slice(1)];
  }

  if (!args.length || args[0] !== "lab") {
    return args;
  }

  const subcommand = args[1];
  const rest = args.slice(2);

  if (!subcommand || subcommand === "status") {
    return ["status", ...rest];
  }
  if (subcommand === "next") {
    return ["next", ...rest];
  }
  if (subcommand === "map") {
    return ["map", ...rest];
  }
  if (subcommand === "companion" || subcommand === "buddy") {
    return ["companion", ...rest];
  }
  if (subcommand === "pitwall") {
    return ["pitwall", ...rest];
  }
  if (subcommand === "owners") {
    return ["pitwall", "--owners", ...rest];
  }
  if (subcommand === "queue") {
    return ["pitwall", "--queue", ...rest];
  }
  if (subcommand === "detail") {
    const selector = args[2];
    const tail = args.slice(3);
    return selector ? ["pitwall", "--detail", selector, ...tail] : ["pitwall", ...tail];
  }

  return ["status", ...args.slice(1)];
}
