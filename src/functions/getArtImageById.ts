import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, SASProtocol, generateBlobSASQueryParameters } from "@azure/storage-blob";
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";

const containerName = process.env["STORAGE_CONTAINER"]!;
const accountName = process.env["AZURE_STORAGE_ACCOUNT_NAME"]!;
const accountKey = process.env["AZURE_STORAGE_ACCOUNT_KEY"]!;
const blobAccountUrl = `https://${accountName}.blob.core.windows.net`;
const tableAccountUrl = `https://${accountName}.table.core.windows.net`;
const tableName = process.env["TABLE_NAME"];

export async function getArtImageById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const id = request.params.id;

  if (!id) {
    return {
      status: 400,
      body: "Missing id query parameter"
    };
  }

  try {
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const tableCredential = new AzureNamedKeyCredential(accountName, accountKey);

    const blobServiceClient = new BlobServiceClient(blobAccountUrl, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const tableClient = new TableClient(tableAccountUrl, tableName, tableCredential);

    let matchedEntity;

    for await (const entity of tableClient.listEntities({ queryOptions: { filter: `Id eq ${id}` } })) {
      matchedEntity = entity;
      break;
    }

    if (!matchedEntity) {
      return { status: 404, body: `No metadata found for artwork ID ${id}` };
    }

    const blobName = matchedEntity.rowKey;
    const blobClient = containerClient.getBlobClient(blobName);

    const sasToken = generateBlobSASQueryParameters({
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + 15 * 60 * 1000),
      protocol: SASProtocol.HttpsAndHttp
    }, sharedKeyCredential).toString();

    const blobUrl = `${blobClient.url}?${sasToken}`;

    return {
      status: 200,
      jsonBody: {
        url: blobUrl,
        title: matchedEntity.Title,
        description: matchedEntity.Description,
        year: matchedEntity.Year,
        quantity: matchedEntity.Quantity
      }
    };

  } catch (error: any) {
    context.error(`Failed to get artwork by id ${id}:`, error);
    return {
      status: 500,
      body: "Internal server error"
    };
  }
};

app.http('getArtImageById', {
    route: 'art/{id}',
    methods: ['GET'],
    authLevel: 'function',
    handler: getArtImageById
});
