import {
  Controller, Get, Post, Body,
  Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LedgerService }  from './ledger.service.js';
import { MintDto }        from './dto/mint.dto.js';
import { TransferDto }    from './dto/transfer.dto.js';
import { LedgerQueryDto } from './dto/ledger-query.dto.js';
import { JwtAuthGuard }   from '../auth/jwt-auth.guard.js';
import { CurrentUser }    from '../auth/current-user.decorator.js';

@ApiTags('ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post('mint')
  @ApiOperation({ summary: 'Mint VAKS tokens on-chain (admin)' })
  mint(@Body() dto: MintDto) {
    return this.ledgerService.mint(dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer VAKS on-chain' })
  transfer(@CurrentUser() user: any, @Body() dto: TransferDto) {
    return this.ledgerService.transfer(user.id, dto);
  }

  @Post('wallet')
  @ApiOperation({ summary: 'Register wallet address for current user' })
  registerWallet(
    @CurrentUser() user: any,
    @Body('walletAddress') walletAddress: string,
  ) {
    return this.ledgerService.registerWallet(user.id, walletAddress);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get on-chain VAKS balance of current user' })
  getBalance(@CurrentUser() user: any) {
    return this.ledgerService.getBalance(user.id);
  }

  @Get('balance/:address')
  @ApiOperation({ summary: 'Get on-chain VAKS balance by wallet address' })
  getBalanceByAddress(@Param('address') address: string) {
    return this.ledgerService.getBalanceByAddress(address);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get ledger history for current user' })
  getHistory(@CurrentUser() user: any, @Query() query: LedgerQueryDto) {
    return this.ledgerService.getHistory(user.id, query);
  }

  @Get('tx/:hash')
  @ApiOperation({ summary: 'Get transaction details by hash' })
  getTransaction(@Param('hash') hash: string) {
    return this.ledgerService.getTransaction(hash);
  }
}