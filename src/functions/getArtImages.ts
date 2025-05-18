import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  SASProtocol,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { AzureNamedKeyCredential, TableClient } from "@azure/data-tables";

const containerName = process.env["STORAGE_CONTAINER"];
const accountName = process.env["AZURE_STORAGE_ACCOUNT_NAME"];
const accountKey = process.env["AZURE_STORAGE_ACCOUNT_KEY"];
const blobAccountUrl = `https://${accountName}.blob.core.windows.net`;
const tableAccountUrl = `https://${accountName}.table.core.windows.net`;
const tableName = process.env["TABLE_NAME"];

export async function getArtImages(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );
    const tableCredential = new AzureNamedKeyCredential(
      accountName,
      accountKey
    );

    const blobServiceClient = new BlobServiceClient(
      blobAccountUrl,
      sharedKeyCredential
    );
    const tableClient = new TableClient(tableAccountUrl, tableName, tableCredential);

    const containerClient = blobServiceClient.getContainerClient(containerName);

    const results = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      const fileName = blob.name;
      console.log(fileName)

      let metadata;

      try {
        metadata = await tableClient.getEntity("Artwork", fileName);
        console.log(metadata)

      } catch (err) {
        context.warn(`Metadata not found for ${fileName}. Error: ${err}`);
        metadata = {
          Title: null,
          Description: null,
          Year: null,
          Quantity: null,
        };
      }

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName,
          blobName: blob.name,
          permissions: BlobSASPermissions.parse("r"),
          expiresOn: new Date(new Date().valueOf() + 15 * 60 * 1000),
          protocol: SASProtocol.HttpsAndHttp,
        },
        sharedKeyCredential
      ).toString();

      const blobUrl = `${containerClient.url}/${blob.name}?${sasToken}`;
      results.push({
        id: metadata?.Id,
        url: blobUrl,
        title: metadata?.Title,
        description: metadata?.Description,
        year: metadata?.Year,
        quantity: metadata?.Quantitiy,
      });
    }

    return {
      status: 200,
      jsonBody: {
        artworks: results,
      },
    };
  } catch (err: any) {
    context.error("Error listing blobs:", err);
    return {
      status: 500,
      body: "Failed to fetch images.",
    };
  }
}

app.http("getArtImages", {
  methods: ["GET"],
  authLevel: "function",
  handler: getArtImages,
});
