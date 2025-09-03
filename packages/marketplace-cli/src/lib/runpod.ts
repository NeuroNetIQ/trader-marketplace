import fetch from "node-fetch";

export interface RunPodDeployment {
  id: string;
  name: string;
  status: string;
  endpoints?: {
    http?: string;
  };
}

export interface RunPodCreateOptions {
  name: string;
  imageUri: string;
  containerDiskInGb: number;
  volumeInGb?: number;
  cpu: number;
  memory: number;
  gpu?: string;
  env?: Record<string, string>;
  ports?: number[];
}

/**
 * Create a RunPod deployment
 */
export async function createRunPodDeployment(
  apiKey: string,
  options: RunPodCreateOptions
): Promise<RunPodDeployment> {
  const response = await fetch("https://api.runpod.io/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: `
        mutation CreatePod($input: PodInput!) {
          podCreate(input: $input) {
            id
            name
            status
            endpoints {
              http
            }
          }
        }
      `,
      variables: {
        input: {
          name: options.name,
          imageUri: options.imageUri,
          containerDiskInGb: options.containerDiskInGb,
          volumeInGb: options.volumeInGb || 10,
          cpu: options.cpu,
          memory: options.memory,
          gpu: options.gpu,
          env: options.env,
          ports: options.ports || [8080],
        },
      },
    }),
  });

  const data = await response.json() as any;
  
  if (!response.ok || data.errors) {
    throw new Error(`RunPod API error: ${data?.errors?.[0]?.message || response.statusText}`);
  }

  return data?.data?.podCreate;
}

/**
 * Get RunPod deployment status
 */
export async function getRunPodDeployment(
  apiKey: string,
  deploymentId: string
): Promise<RunPodDeployment> {
  const response = await fetch("https://api.runpod.io/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: `
        query GetPod($id: String!) {
          pod(id: $id) {
            id
            name
            status
            endpoints {
              http
            }
          }
        }
      `,
      variables: { id: deploymentId },
    }),
  });

  const data = await response.json() as any;
  
  if (!response.ok || data.errors) {
    throw new Error(`RunPod API error: ${data?.errors?.[0]?.message || response.statusText}`);
  }

  return data?.data?.pod;
}

/**
 * Delete RunPod deployment
 */
export async function deleteRunPodDeployment(
  apiKey: string,
  deploymentId: string
): Promise<void> {
  const response = await fetch("https://api.runpod.io/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: `
        mutation DeletePod($id: String!) {
          podDelete(id: $id) {
            id
          }
        }
      `,
      variables: { id: deploymentId },
    }),
  });

  const data = await response.json() as any;
  
  if (!response.ok || data.errors) {
    throw new Error(`RunPod API error: ${data?.errors?.[0]?.message || response.statusText}`);
  }
}
