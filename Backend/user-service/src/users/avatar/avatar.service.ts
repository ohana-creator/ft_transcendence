import { Injectable, BadRequestException } from '@nestjs/common';
import { join } from 'path';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';
import { MultipartFile } from '@fastify/multipart';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');

@Injectable()
export class AvatarService {
  constructor() {
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  async saveAvatar(userId: number, file: MultipartFile): Promise<string> {
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

    // Remove old avatar if exists
    this.deleteAvatarFile(userId);

    const filename = `avatar-${userId}-${Date.now()}.jpg`;
    const filepath = join(UPLOAD_DIR, filename);

    // Resize + convert to jpg
    await sharp(buffer).resize(256, 256, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(filepath);

    return `/uploads/avatars/${filename}`;
  }

  deleteAvatarFile(userId: number) {
    const files = existsSync(UPLOAD_DIR)
      ? require('fs').readdirSync(UPLOAD_DIR).filter((f: string) => f.startsWith(`avatar-${userId}-`))
      : [];
    files.forEach((f: string) => {
      try { unlinkSync(join(UPLOAD_DIR, f)); } catch {}
    });
  }
}