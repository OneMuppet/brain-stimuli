import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Image, CreateImageUploadRequest } from "../types/image";

const getTableName = (): string => {
  return process.env.TABLE_NAME || "brain-stimuli-table";
};

const getBucketName = (): string => {
  return process.env.BUCKET_NAME || "images-bucket";
};

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({});

export class ImageRepository {
  async createImageUpload(request: CreateImageUploadRequest): Promise<{
    uploadUrl: string;
    imageId: string;
    s3Key: string;
  }> {
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const s3Key = `sessions/${request.sessionId}/images/${imageId}`;
    
    // Create pre-signed URL for upload
    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: s3Key,
      ContentType: request.contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    // Store image metadata in DynamoDB
    const image: Image = {
      id: imageId,
      sessionId: request.sessionId,
      s3Key,
      s3Bucket: getBucketName(),
      timestamp: Date.now(),
      contentType: request.contentType,
    };

    const item = {
      pk: `SESSION#${request.sessionId}`,
      sk: `IMAGE#${imageId}`,
      entityType: "image",
      ...image,
    };

    await ddbDocClient.send(new PutCommand({
      TableName: getTableName(),
      Item: item,
    }));

    return {
      uploadUrl,
      imageId,
      s3Key,
    };
  }

  async listImages(sessionId: string): Promise<Image[]> {
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `SESSION#${sessionId}`,
        ":skPrefix": "IMAGE#",
      },
      ScanIndexForward: false, // Sort by timestamp descending
    }));

    return (result.Items || [])
      .filter(item => item.entityType === "image")
      .map(item => ({
        id: item.id,
        sessionId: item.sessionId,
        s3Key: item.s3Key,
        s3Bucket: item.s3Bucket,
        timestamp: item.timestamp,
        contentType: item.contentType,
      }));
  }

  async getImageUrl(s3Key: string, s3Bucket: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
  }
}
