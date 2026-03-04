import { Controller, Get, UseGuards, Post, HttpCode, Body, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { WalletService } from './wallet.service.js';
import { TransferDto } from './dto/transfer.dto.js';
import { TransactionsQueryDto } from './dto/transactions-query.dto.js';

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

     @Get('transaction:id')
    @ApiOperation({ summary: 'Get transaction details by ID' })
    async getTransaction(
      @CurrentUser() user: { userId: string },
      @Param('id') id: string,)
    {
      return this.walletService.getTransactionById(id, user.userId);
    }

}
