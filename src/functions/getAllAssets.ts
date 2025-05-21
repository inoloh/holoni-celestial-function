import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

const containerName = process.env["STORAGE_CONTAINER_ASSETS"];
const accountName = process.env["AZURE_STORAGE_ACCOUNT_NAME"];
const accountKey = process.env["AZURE_STORAGE_ACCOUNT_KEY"];
const blobAccountUrl = `https://${accountName}.blob.core.windows.net`;

export async function getAllAssets(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(blobAccountUrl, credential);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const results = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      const blobUrl = `${containerClient.url}/${blob.name}`;

      results.push({
        url: blobUrl,
        name: blob.name,
      });
    }

    return {
      status: 200,
      jsonBody: {
        results
      },
    };
  } catch (err: any) {
    context.error("Error listing blobs:", err.message);
    return {
      status: 500,
      body: "Failed to fetch assets.",
    };
  }
}

app.http("/assets", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getAllAssets,
});
