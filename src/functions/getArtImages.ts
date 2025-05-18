import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, SASProtocol, generateBlobSASQueryParameters} from "@azure/storage-blob";

const containerName = process.env["STORAGE_CONTAINER"];
const accountName = process.env["AZURE_STORAGE_ACCOUNT_NAME"];
const accountKey = process.env["AZURE_STORAGE_ACCOUNT_KEY"];

export async function getArtImages(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

        const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);

        const containerClient = blobServiceClient.getContainerClient(containerName);
    
        const imageUrls: string[] = [];

        for await (const blob of containerClient.listBlobsFlat()) {
          const sasToken = generateBlobSASQueryParameters(
            {
                containerName,
                blobName: blob.name,
                permissions: BlobSASPermissions.parse('r'),
                expiresOn: new Date(new Date().valueOf() + 15 * 60 * 1000),
                protocol: SASProtocol.HttpsAndHttp
            }, 
            sharedKeyCredential
          ).toString();

          const blobUrl = `${containerClient.url}/${blob.name}?${sasToken}`;
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