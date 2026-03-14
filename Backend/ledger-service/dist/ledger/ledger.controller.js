"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ledger_service_js_1 = require("./ledger.service.js");
const mint_dto_js_1 = require("./dto/mint.dto.js");
const transfer_dto_js_1 = require("./dto/transfer.dto.js");
const ledger_query_dto_js_1 = require("./dto/ledger-query.dto.js");
const jwt_auth_guard_js_1 = require("../auth/jwt-auth.guard.js");
const current_user_decorator_js_1 = require("../auth/current-user.decorator.js");
let LedgerController = class LedgerController {
    constructor(ledgerService) {
        this.ledgerService = ledgerService;
    }
    mint(dto) {
        return this.ledgerService.mint(dto);
    }
    transfer(user, dto) {
        return this.ledgerService.transfer(user.id, dto);
    }
    registerWallet(user, walletAddress) {
        return this.ledgerService.registerWallet(user.id, walletAddress);
    }
    getBalance(user) {
        return this.ledgerService.getBalance(user.id);
    }
    getBalanceByAddress(address) {
        return this.ledgerService.getBalanceByAddress(address);
    }
    getHistory(user, query) {
        return this.ledgerService.getHistory(user.id, query);
    }
    getTransaction(hash) {
        return this.ledgerService.getTransaction(hash);
    }
};
exports.LedgerController = LedgerController;
__decorate([
    (0, common_1.Post)('mint'),
    (0, swagger_1.ApiOperation)({ summary: 'Mint VAKS tokens on-chain (admin)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mint_dto_js_1.MintDto]),
    __metadata("design:returntype", void 0)
], LedgerController.prototype, "mint", null);
__decorate([
    (0, common_1.Post)('transfer'),
    (0, swagger_1.ApiOperation)({ summary: 'Transfer VAKS on-chain' }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, transfer_dto_js_1.TransferDto]),
    __metadata("design:returntype", void 0)
], LedgerController.prototype, "transfer", null);
__decorate([
    (0, common_1.Post)('wallet'),
    (0, swagger_1.ApiOperation)({ summary: 'Register wallet address for current user' }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('walletAddress')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LedgerController.prototype, "registerWallet", null);
__decorate([
    (0, common_1.Get)('balance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get on-chain VAKS balance of current user' }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LedgerController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('balance/:address'),
    (0, swagger_1.ApiOperation)({ summary: 'Get on-chain VAKS balance by wallet address' }),
    __param(0, (0, common_1.Param)('address')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LedgerController.prototype, "getBalanceByAddress", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get ledger history for current user' }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ledger_query_dto_js_1.LedgerQueryDto]),
    __metadata("design:returntype", void 0)
], LedgerController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('tx/:hash'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction details by hash' }),
    __param(0, (0, common_1.Param)('hash')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LedgerController.prototype, "getTransaction", null);
exports.LedgerController = LedgerController = __decorate([
    (0, swagger_1.ApiTags)('ledger'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard),
    (0, common_1.Controller)('ledger'),
    __metadata("design:paramtypes", [ledger_service_js_1.LedgerService])
], LedgerController);
//# sourceMappingURL=ledger.controller.js.map