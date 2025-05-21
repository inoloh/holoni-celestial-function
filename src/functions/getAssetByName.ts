import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

const containerName = process.env["STORAGE_CONTAINER_ASSETS"];
const accountName = process.env["AZURE_STORAGE_ACCOUNT_NAME"];
const accountKey = process.env["AZURE_STORAGE_ACCOUNT_KEY"];
const blobAccountUrl = `https://${accountName}.blob.core.windows.net`;

export async function getAssetByName(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const blobName = request.params.name;

  try {
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(blobAccountUrl, credential);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const exists = await blobClient.exists();
    if (!exists) {
      return {
        status: 404,
        body: `Asset "${blobName}" not found.`,
      };
    }

    const url = `${containerClient.url}/${blobName}`;

    return {
      status: 200,
      jsonBody: {
        name: blobName,
        url,
      },
    };
  } catch (error: any) {
    context.error("Error fetching asset:", error);
    return {
      status: 500,
      body: "Failed to fetch asset.",
    };
  }
};

app.http('getAssetByName', {
    route: "/assets/{name}",
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: getAssetByName
});
