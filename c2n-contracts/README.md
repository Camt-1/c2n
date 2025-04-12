### Developement instructions
- `$ yarn install` - _Install all dependencies_
- `$ echo PK="PRIVATE_KEY" > .env` - _Add testing private key_
- `$ npx hardhat compile` - _Compile all contracts_
- `$ npx hardhat test` - _Run all tests_


- Migrations are inside `scripts/` folder.
- Tests are inside `test/` folder.


node 版本：v18.19.1

部署流程
1. `npx hardhat run --network local scripts/deployment/deploy_boba_token.js`
2. `npx hardhat run --network local scripts/deployment/deploy_c2n_token.js`
3. `npx hardhat run --network local scripts/deployment/deploy_airdrop_c2n.js` 
4. `npx hardhat run --network local scripts/deployment/deploy_mock_token.js`
5. `npx hardhat run --network local scripts/deployment/deploy_singletons.js`
6. 设置saleConfig
7. `npx hardhat run --network local scripts/deployment/deploy_sales.js`


## makefile命令解释
将脚本命令简化成了make直接可执行的命令，写到了makefile中

需要安装`make`编译工具，如果没有安装，直接执行makefile文件中的js命令也可以

命令列表：
farm流程涉及执行的命令
- farm
AllocationStaking & ido流程涉及执行的命令
- ido
- sales
- deposit
启动本地测试链
- node
运行单测
- runtest
升级合约（暂未使用）
- upgrades