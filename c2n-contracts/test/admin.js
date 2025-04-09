const { ethers } = require("hardhat");
const { expect } = require("chai");

/**
 * 测试用例使用了Mocha测试框架的结果,包括以下部分:
 * - describe: 描述测试的模块或合约
 * - beforeEach: 在每个测试执行前运行的初始化代码
 * - context: 用于分组相关的测试
 * - it: 定义具体的测试用例
 */
describe("Admin", function() {
  let Admin;
  let deployer, alice, bob, cedric;
  let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  //合约初始化
  beforeEach(async function() {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    alice = accounts[1];
    bob = accounts[2];
    cedric = accounts[3];

    const AdminFactory = await ethers.getContractFactory("Admin");
    Admin = await AdminFactory.deploy([deployer.address, alice.address, bob.address]);
  });
    
  //合约的初始状态验证
  context("Setup", async function() {
    it("Should setup the admin contract correctly", async function() {
      let admins = await Admin.getAllAdmins();
      expect(admins.length).to.eq(3);

      expect(await Admin.isAdmin(deployer.address)).to.be.true;
      expect(await Admin.isAdmin(alice.address)).to.be.true;
      expect(await Admin.isAdmin(bob.address)).to.be.true;
      expect(await Admin.isAdmin(ZERO_ADDRESS)).to.be.false;
    });
  });

  //删除管理员功能
  context("Remove admins", async function() {
    //正常删除管理员
    it("Should allow removal a middle using an admin address", async function() {
      let admins = await Admin.getAllAdmins();
      expect(admins.length).to.eq(3);

      await Admin.removeAdmin(admins[1]);

      admins = await Admin.getAllAdmins();
      expect(admins.length).to.eq(2);

      expect(await Admin.isAdmin(deployer.address)).to.be.true;
      expect(await Admin.isAdmin(alice.address)).to.be.true;
      expect(await Admin.isAdmin(bob.address)).to.be.true;
      expect(await Admin.isAdmin(ZERO_ADDRESS)).to.be.false;
    });

    //非管理员不能删除管理员
    it("Should not allow a non-admin to removal an admin", async function() {
      expect(await Admin.isAdmin(deployer.address)).to.be.true;

      await Admin.removeAdmin(deployer.address);
      expect(await Admin.isAdmin(deployer.address)).to.be.false;
      expect(await Admin.isAdmin(alice.address)).to.be.true;

      await expect(Admin.removeAdmin(alice.address)).to.be.revertedWith('Only admin can call.');
      expect(await Admin.isAdmin(deployer.address)).to.be.false;
      expect(await Admin.isAdmin(alice.address)).to.be.true;
    });

    //防止重复删除管理员
    it("Should not allow removing an admin twice", async function() {
      expect(await Admin.isAdmin(alice.address)).to.be.true;
      await Admin.removeAdmin(alice.address);
      expect(await Admin.isAdmin(alice.address)).to.be.false;

      await expect(Admin.removeAdmin(alice.address)).to.be.reverted;
    });
  });

  //添加管理员功能
  context("Add admins", async function() {
    //正常添加管理员
    it("Should allow adding an admin", async function() {
      let admins = await Admin.getAllAdmins();
      expect(admins.length).to.eq(3);
      expect(await Admin.isAdmin(cedric.address)).to.be.false;

      await Admin.addAdmin(cedric.address);

      admins = await Admin.getAllAdmins();
      expect(admins.length).to.eq(4);
      expect(await Admin.isAdmin(cedric.address)).to.be.true;
    });
    //非管理员不能添加管理员
    it("Should not allow a non-admin to add an admin", async function() {
      expect(await Admin.isAdmin(deployer.address)).to.be.true;

      await Admin.removeAdmin(deployer.address);
      expect(await Admin.isAdmin(deployer.address)).to.be.false;
      expect(await Admin.isAdmin(cedric.address)).to.be.false;

      await expect(Admin.addAdmin(cedric.address)).to.be.revertedWith('Only admin can call.');
      expect(await Admin.isAdmin(deployer.address)).to.be.false;
      expect(await Admin.isAdmin(cedric.address)).to.be.false;
    });

    //防止添加零地址
    it("Should not allow adding the zero address as an admin", async function() {
      expect(await Admin.isAdmin(ZERO_ADDRESS)).to.be.false;

      await expect(Admin.addAdmin(ZERO_ADDRESS)).to.revertedWith("[RBAC]: Admin must be != than 0x0 address");
    });

    //防止重复添加管理员
    it("Should not allow adding an admin twice", async function() {
      expect(await Admin.isAdmin(cedric.address)).to.be.false;
      await Admin.addAdmin(cedric.address);
      expect(await Admin.isAdmin(cedric.address)).to.be.true;

      await expect(Admin.addAdmin(cedric.address)).to.be.revertedWith("[RBAC]: Admin already exists.");
    });
  });
});
/**
 * 测试的目标是验证 Admin 合约的以下功能:
 * 1. 合约的初始化和管理员的初始配置
 * 2. 添加管理的功能
 * 3. 删除管理员的功能
 * 4. 合约的权限控制(如非管理员不能添加或删除管理员)
 * 5. 防止非法操作(如重复添加或删除管理员)
 */
