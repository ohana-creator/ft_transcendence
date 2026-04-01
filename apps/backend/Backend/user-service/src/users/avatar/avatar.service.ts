import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { MultipartFile } from '@fastify/multipart';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class AvatarService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET');
    this.publicUrl = this.config.getOrThrow<string>('R2_PUBLIC_URL');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.config.getOrThrow<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async saveAvatar(userId: string, file: MultipartFile): Promise<string> {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG and PNG files are allowed');
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;

    for await (const chunk of file.file) {
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE_BYTES) {
        throw new BadRequestException('File exceeds 5MB limit');
      }
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Validate image format with sharp
    try {
      const metadata = await sharp(buffer).metadata();
      if (!['jpeg', 'png'].includes(metadata.format ?? '')) {
        throw new BadRequestException('Invalid image format');
      }
    } catch {
      throw new BadRequestException('Invalid or corrupted image file');
    }

    // Remove old avatar(s) from R2
    await this.deleteAvatarFiles(userId);

    // Resize + convert to jpg
    const processed = await sharp(buffer)
      .resize(256, 256, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const key = `avatars/avatar-${userId}-${Date.now()}.jpg`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: processed,
        ContentType: 'image/jpeg',
      }),
    );

    return `${this.publicUrl}/${key}`;
  }

  async deleteAvatarFiles(userId: string): Promise<void> {
    const prefix = `avatars/avatar-${userId}-`;

    const listed = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );

    if (listed.Contents?.length) {
      await Promise.all(
        listed.Contents.map((obj) =>
          this.s3.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: obj.Key!,
            }),
          ),
        ),
      );
    }
  }
}