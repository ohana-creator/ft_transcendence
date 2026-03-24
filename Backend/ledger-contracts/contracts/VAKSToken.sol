// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VAKSToken
 * @notice ERC-20 like token para a plataforma VAKS.
 *         Apenas o admin (Ledger Service) pode fazer mint.
 *         Qualquer holder pode transferir.
 *         Todos os movimentos ficam registados on-chain via eventos.
 */
contract VAKSToken {
    // ─── Metadata ───────────────────────────────────────────
    string  public constant name     = "VAKS Token";
    string  public constant symbol   = "VAKS";
    uint8   public constant decimals = 18;

    // ─── State ──────────────────────────────────────────────
    address public admin;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // ─── Events ─────────────────────────────────────────────
    event Transfer(address indexed from,    address indexed to,      uint256 value);
    event Approval(address indexed owner,   address indexed spender, uint256 value);
    event Mint    (address indexed to,      uint256 value,           string  ref);
    event Burn    (address indexed from,    uint256 value,           string  ref);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    // ─── Errors ─────────────────────────────────────────────
    error OnlyAdmin();
    error ZeroAddress();
    error InsufficientBalance(uint256 have, uint256 want);
    error AllowanceExceeded(uint256 have, uint256 want);
    error ZeroAmount();

    // ─── Modifiers ──────────────────────────────────────────
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // ─── Admin ──────────────────────────────────────────────

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    // ─── Mint / Burn ────────────────────────────────────────

    /**
     * @notice Cria tokens para um endereço.
     * @param to     Endereço de destino
     * @param amount Quantidade em wei (18 decimais)
     * @param ref    Referência off-chain (ex: userId, transactionId)
     */
    function mint(address to, uint256 amount, string calldata ref) external onlyAdmin {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0)      revert ZeroAmount();

        _totalSupply  += amount;
        _balances[to] += amount;

        emit Mint(to, amount, ref);
        emit Transfer(address(0), to, amount);
    }

    /**
     * @notice Destrói tokens de um endereço (admin only).
     * @param from   Endereço de origem
     * @param amount Quantidade em wei
     * @param ref    Referência off-chain
     */
    function burn(address from, uint256 amount, string calldata ref) external onlyAdmin {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0)        revert ZeroAmount();
        if (_balances[from] < amount) revert InsufficientBalance(_balances[from], amount);

        _balances[from] -= amount;
        _totalSupply    -= amount;

        emit Burn(from, amount, ref);
        emit Transfer(from, address(0), amount);
    }

    // ─── ERC-20 Core ────────────────────────────────────────

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        if (allowed < amount) revert AllowanceExceeded(allowed, amount);
        _allowances[from][msg.sender] -= amount;
        _transfer(from, to, amount);
        return true;
    }

    // ─── Internal ───────────────────────────────────────────

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0))           revert ZeroAddress();
        if (amount == 0)                revert ZeroAmount();
        if (_balances[from] < amount)   revert InsufficientBalance(_balances[from], amount);

        _balances[from] -= amount;
        _balances[to]   += amount;

        emit Transfer(from, to, amount);
    }
}