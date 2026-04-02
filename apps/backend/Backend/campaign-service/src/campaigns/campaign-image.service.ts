import {
  Injectable,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { MultipartFile } from '@fastify/multipart';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CampaignImageService {
  private readonly logger = new Logger(CampaignImageService.name);
  private readonly storageMode: 'local' | 'r2';
  private readonly uploadsDir: string;
  private readonly publicBaseUrl: string;
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.storageMode = this.config.get<'local' | 'r2'>('CAMPAIGN_IMAGE_STORAGE', 'local');
    this.uploadsDir = this.config.get<string>('CAMPAIGN_UPLOADS_DIR', 'uploads');
    this.publicBaseUrl = this.config.get<string>('CAMPAIGN_PUBLIC_BASE_URL', 'https://localhost:3000');

    this.bucket = this.config.get<string>('R2_BUCKET', '');
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '');

    if (this.storageMode === 'local') {
      mkdirSync(this.uploadsDir, { recursive: true });
      this.logger.log(`Campaign image storage mode: local (${this.uploadsDir})`);
      return;
    }

    const r2Endpoint = this.config.getOrThrow<string>('R2_ENDPOINT');
    const r2AccessKeyId = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
    
    this.logger.log(`Campaign image storage mode: r2 (bucket=${this.bucket})`);
  }

  async saveCampaignImage(userId: string, file: MultipartFile): Promise<string> {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG and WebP files are allowed');
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

    try {
      const metadata = await sharp(buffer).metadata();
      
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
        throw new BadRequestException('Invalid image format');
      }
    } catch {
      throw new BadRequestException('Invalid or corrupted image file');
    }
    
    const processed = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const key = `campaigns/${userId}/campaign-${Date.now()}.jpg`;

    if (this.storageMode === 'local') {
      const localPath = join(this.uploadsDir, key);
      mkdirSync(join(this.uploadsDir, 'campaigns', userId), { recursive: true });
      await writeFile(localPath, processed);
      return `${this.publicBaseUrl}/uploads/${key}`;
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: processed,
          ContentType: 'image/jpeg',
        }),
      );
    } catch {
      throw new ServiceUnavailableException('Image storage temporarily unavailable');
    }
    
    return `${this.publicUrl}/${key}`;
  }
}