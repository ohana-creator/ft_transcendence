import { Controller, Get, UseGuards, Post, HttpCode, Body, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { InternalServiceGuard } from '../auth/internal-service.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { WalletService } from './wallet.service.js';
import { TransferDto } from './dto/transfer.dto.js';
import { InternalDepositDto } from './dto/internal-deposit.dto.js';
import { TransactionsQueryDto } from './dto/transactions-query.dto.js';
import { CampaignContributeDto } from './dto/campaign-contribute.dto.js';

// ── Public Wallet endpoints (JWT-authenticated) ─────────────

@ApiTags('Wallet')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}
  
  @Get()
  @ApiOperation({ summary: 'Get wallet of authenticated user' })
  async getWallet(@CurrentUser() user: { userId: string })
  {
    return this.walletService.getWalletByUserId(user.userId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get balance of authenticated user' })
  async getBalance(@CurrentUser() user: { userId: string })
  {
    return this.walletService.getBalance(user.userId);
  }
  
  @Post('transfer')
  @HttpCode(201)
  @ApiOperation({ summary: 'Transfer VAKS to another user' })
  async transfer(
    @CurrentUser() user: { userId: string },
    @Body() dto: TransferDto,)
  {
    return this.walletService.transfer(user.userId, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get paginated transaction history' })
  async getTransactions(
    @CurrentUser() user: { userId: string },
    @Query() query: TransactionsQueryDto,
  ) {
    return this.walletService.getTransactions(user.userId, query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction details by ID' })
  async getTransaction(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,)
  {
    return this.walletService.getTransactionById(id, user.userId);
  }
}

// ── Internal endpoints (service-to-service via API key) ─────

@ApiTags('Wallet — Internal')
@UseGuards(InternalServiceGuard)
@Controller('wallet/campaign')
export class WalletInternalController {
  constructor(private readonly walletService: WalletService) {}

  @Post('contribute')
  @HttpCode(201)
  @ApiHeader({ name: 'x-internal-api-key', description: 'Internal service-to-service API key', required: true })
  @ApiOperation({ summary: 'Contribute to a campaign (internal — called by Campaign Service)' })
  async contributeToCampaign(@Body() dto: CampaignContributeDto)
  {
    return this.walletService.contributeToCampaign(dto);
  }

  @Post('refund')
  @HttpCode(201)
  @ApiHeader({ name: 'x-internal-api-key', description: 'Internal service-to-service API key', required: true })
  @ApiOperation({ summary: 'Refund a campaign contribution (internal — saga compensation)' })
  async refundContribution(@Body() dto: CampaignContributeDto)
  {
    return this.walletService.refundContribution(dto);
  }

  @Post('deposit')
  @HttpCode(201)
  @ApiHeader({ name: 'x-internal-api-key', description: 'Internal service-to-service API key', required: true })
  @ApiOperation({ summary: 'Deposit VAKS into wallet (internal)' })
  async deposit(@Body() dto: InternalDepositDto)
  {
    return this.walletService.deposit(dto.userId, dto);
  }
}
