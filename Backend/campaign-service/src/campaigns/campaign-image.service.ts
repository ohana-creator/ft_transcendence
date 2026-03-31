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
    console.log('[IMAGE SERVICE] Inicializando CampaignImageService...');
    
    this.storageMode = this.config.get<'local' | 'r2'>('CAMPAIGN_IMAGE_STORAGE', 'local');
    this.uploadsDir = this.config.get<string>('CAMPAIGN_UPLOADS_DIR', 'uploads');
    this.publicBaseUrl = this.config.get<string>('CAMPAIGN_PUBLIC_BASE_URL', 'http://localhost:3000');

    console.log('[IMAGE SERVICE] Configurações carregadas:');
    console.log('[IMAGE SERVICE] - storageMode:', this.storageMode);
    console.log('[IMAGE SERVICE] - uploadsDir:', this.uploadsDir);
    console.log('[IMAGE SERVICE] - publicBaseUrl:', this.publicBaseUrl);

    this.bucket = this.config.get<string>('R2_BUCKET', '');
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '');

    if (this.storageMode === 'local') {
      console.log('[IMAGE SERVICE] Configurando armazenamento local...');
      mkdirSync(this.uploadsDir, { recursive: true });
      this.logger.log(`Campaign image storage mode: local (${this.uploadsDir})`);
      console.log('[IMAGE SERVICE] Diretório de uploads criado:', this.uploadsDir);
      return;
    }

    console.log('[IMAGE SERVICE] Configurando armazenamento R2/S3...');
    console.log('[IMAGE SERVICE] - bucket:', this.bucket);
    console.log('[IMAGE SERVICE] - publicUrl:', this.publicUrl);
    
    const r2Endpoint = this.config.getOrThrow<string>('R2_ENDPOINT');
    const r2AccessKeyId = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID');
    
    console.log('[IMAGE SERVICE] - endpoint:', r2Endpoint);
    console.log('[IMAGE SERVICE] - accessKeyId:', r2AccessKeyId ? `${r2AccessKeyId.substring(0, 4)}***` : 'NÃO DEFINIDO');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      // Use path-style to avoid bucket-prefixed hostnames that may fail DNS resolution in some Docker setups.
      forcePathStyle: true,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
    
    this.logger.log(`Campaign image storage mode: r2 (bucket=${this.bucket})`);
    console.log('[IMAGE SERVICE] Cliente S3 configurado com sucesso');
  }

  async saveCampaignImage(userId: string, file: MultipartFile): Promise<string> {
    console.log('[IMAGE SERVICE] Iniciando processamento de imagem para userId:', userId);
    console.log('[IMAGE SERVICE] Detalhes do arquivo:', {
      mimetype: file.mimetype,
      encoding: file.encoding,
      fieldname: file.fieldname,
      filename: file.filename
    });
    console.log('[IMAGE SERVICE] MimeTypes permitidos:', ALLOWED_MIMETYPES);
    console.log('[IMAGE SERVICE] Tamanho máximo permitido:', MAX_SIZE_BYTES, 'bytes');

    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      console.error('[IMAGE SERVICE] Erro: Tipo de arquivo não permitido:', file.mimetype);
      throw new BadRequestException('Only JPG, PNG and WebP files are allowed');
    }

    console.log('[IMAGE SERVICE] MimeType validado com sucesso');

    const chunks: Buffer[] = [];
    let totalSize = 0;

    console.log('[IMAGE SERVICE] Iniciando leitura dos chunks do arquivo...');
    
    for await (const chunk of file.file) {
      totalSize += chunk.length;
      console.log('[IMAGE SERVICE] Chunk lido:', chunk.length, 'bytes. Total atual:', totalSize);
      
      if (totalSize > MAX_SIZE_BYTES) {
        console.error('[IMAGE SERVICE] Erro: Arquivo excede o limite de tamanho:', totalSize, '>', MAX_SIZE_BYTES);
        throw new BadRequestException('File exceeds 5MB limit');
      }
      chunks.push(chunk);
    }

    console.log('[IMAGE SERVICE] Leitura de chunks concluída. Total de chunks:', chunks.length, 'Tamanho total:', totalSize);
    
    const buffer = Buffer.concat(chunks);
    console.log('[IMAGE SERVICE] Buffer criado com tamanho:', buffer.length);

    try {
      console.log('[IMAGE SERVICE] Iniciando análise de metadados da imagem com Sharp...');
      const metadata = await sharp(buffer).metadata();
      console.log('[IMAGE SERVICE] Metadados da imagem:', {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        density: metadata.density
      });
      
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
        console.error('[IMAGE SERVICE] Erro: Formato de imagem inválido:', metadata.format);
        throw new BadRequestException('Invalid image format');
      }
      
      console.log('[IMAGE SERVICE] Formato de imagem validado com sucesso');
    } catch (error) {
      console.error('[IMAGE SERVICE] Erro ao processar imagem:', error);
      throw new BadRequestException('Invalid or corrupted image file');
    }

    console.log('[IMAGE SERVICE] Iniciando processamento da imagem (redimensionamento + compressão)...');
    
    const processed = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
      
    console.log('[IMAGE SERVICE] Imagem processada. Tamanho final:', processed.length, 'bytes');

    const key = `campaigns/${userId}/campaign-${Date.now()}.jpg`;
    console.log('[IMAGE SERVICE] Chave de armazenamento gerada:', key);
    console.log('[IMAGE SERVICE] Modo de armazenamento:', this.storageMode);

    if (this.storageMode === 'local') {
      console.log('[IMAGE SERVICE] Salvando arquivo localmente...');
      const localPath = join(this.uploadsDir, key);
      console.log('[IMAGE SERVICE] Caminho local:', localPath);
      
      mkdirSync(join(this.uploadsDir, 'campaigns', userId), { recursive: true });
      console.log('[IMAGE SERVICE] Diretórios criados com sucesso');
      
      await writeFile(localPath, processed);
      console.log('[IMAGE SERVICE] Arquivo salvo localmente com sucesso');
      
      const finalUrl = `${this.publicBaseUrl}/uploads/${key}`;
      console.log('[IMAGE SERVICE] URL final gerada:', finalUrl);
      return finalUrl;
    }

    console.log('[IMAGE SERVICE] Salvando arquivo no R2/S3...');
    console.log('[IMAGE SERVICE] Bucket:', this.bucket);
    console.log('[IMAGE SERVICE] Public URL base:', this.publicUrl);

    try {
      console.log('[IMAGE SERVICE] Enviando para S3/R2...');
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: processed,
          ContentType: 'image/jpeg',
        }),
      );
      console.log('[IMAGE SERVICE] Upload para R2/S3 concluído com sucesso');
    } catch (error) {
      console.error('[IMAGE SERVICE] Erro no upload para R2/S3:', error);
      throw new ServiceUnavailableException('Image storage temporarily unavailable');
    }

    const finalUrl = `${this.publicUrl}/${key}`;
    console.log('[IMAGE SERVICE] URL final gerada (R2/S3):', finalUrl);
    
    return finalUrl;
  }
}