import { ethers } from 'hardhat';
import { expect } from 'chai';
import { VAKSToken } from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('VAKSToken', () => {
  let token: VAKSToken;
  let admin: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async () => {
    [admin, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory('VAKSToken');
    token = await F.deploy();
  });

  describe('mint', () => {
    it('admin can mint with ref', async () => {
      await token.mint(alice.address, 1000, 'user:alice');
      expect(await token.balanceOf(alice.address)).to.equal(1000);
      expect(await token.totalSupply()).to.equal(1000);
    });
    it('emits Mint and Transfer events', async () => {
      await expect(token.mint(alice.address, 500, 'deposit:1'))
        .to.emit(token, 'Mint').withArgs(alice.address, 500, 'deposit:1')
        .and.to.emit(token, 'Transfer').withArgs(ethers.ZeroAddress, alice.address, 500);
    });
    it('non-admin cannot mint', async () => {
      await expect(token.connect(alice).mint(bob.address, 100, 'x'))
        .to.be.revertedWithCustomError(token, 'OnlyAdmin');
    });
    it('reverts on zero amount', async () => {
      await expect(token.mint(alice.address, 0, 'x'))
        .to.be.revertedWithCustomError(token, 'ZeroAmount');
    });
    it('reverts on zero address', async () => {
      await expect(token.mint(ethers.ZeroAddress, 100, 'x'))
        .to.be.revertedWithCustomError(token, 'ZeroAddress');
    });
  });

  describe('transfer', () => {
    beforeEach(async () => { await token.mint(alice.address, 1000, 'setup'); });

    it('transfers between accounts', async () => {
      await token.connect(alice).transfer(bob.address, 300);
      expect(await token.balanceOf(alice.address)).to.equal(700);
      expect(await token.balanceOf(bob.address)).to.equal(300);
    });
    it('reverts on insufficient balance', async () => {
      await expect(token.connect(alice).transfer(bob.address, 9999))
        .to.be.revertedWithCustomError(token, 'InsufficientBalance');
    });
  });

  describe('burn', () => {
    beforeEach(async () => { await token.mint(alice.address, 1000, 'setup'); });

    it('admin can burn', async () => {
      await token.burn(alice.address, 400, 'refund:1');
      expect(await token.balanceOf(alice.address)).to.equal(600);
      expect(await token.totalSupply()).to.equal(600);
    });
    it('emits Burn event', async () => {
      await expect(token.burn(alice.address, 100, 'ref:1'))
        .to.emit(token, 'Burn').withArgs(alice.address, 100, 'ref:1');
    });
    it('reverts on insufficient balance', async () => {
      await expect(token.burn(alice.address, 9999, 'x'))
        .to.be.revertedWithCustomError(token, 'InsufficientBalance');
    });
  });

  describe('approve / transferFrom', () => {
    beforeEach(async () => { await token.mint(alice.address, 1000, 'setup'); });

    it('spender can transferFrom after approve', async () => {
      await token.connect(alice).approve(bob.address, 200);
      await token.connect(bob).transferFrom(alice.address, bob.address, 200);
      expect(await token.balanceOf(bob.address)).to.equal(200);
    });
    it('reverts if allowance exceeded', async () => {
      await token.connect(alice).approve(bob.address, 50);
      await expect(token.connect(bob).transferFrom(alice.address, bob.address, 100))
        .to.be.revertedWithCustomError(token, 'AllowanceExceeded');
    });
  });

  describe('admin transfer', () => {
    it('transfers admin role', async () => {
      await token.transferAdmin(alice.address);
      expect(await token.admin()).to.equal(alice.address);
    });
    it('old admin loses access', async () => {
      await token.transferAdmin(alice.address);
      await expect(token.mint(bob.address, 100, 'x'))
        .to.be.revertedWithCustomError(token, 'OnlyAdmin');
    });
  });
});