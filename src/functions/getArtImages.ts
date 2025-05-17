import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";

const connectionString = process.env["AzureWebJobsStorage"];
const containerName = process.env["Storage_Container"];

export async function getArtImages(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
    
        const imageUrls: string[] = [];
        for await (const blob of containerClient.listBlobsFlat()) {
          const blobUrl = `${containerClient.url}/${blob.name}`;
          imageUrls.push(blobUrl);
        }
    
        return {
          status: 200,
          jsonBody: {
            images: imageUrls,
          },
        };
      } catch (err: any) {
        context.error("Error listing blobs:", err);
        return {
          status: 500,
          body: "Failed to fetch images.",
        };
      }
};

app.http('getArtImages', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: getArtImages
});
