import { env } from "@/config/env";
import Docker from "dockerode";

export const docker = new Docker({ socketPath: env.DOCKER_SOCKET_PATH });
