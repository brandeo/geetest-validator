# geetest-manual-validator
极验手动验证服务器
## 安装（二选其一）

```
git clone --depth=1 https://gitee.com/ikenxuan/geetest-validator.git

```
```
# 安装依赖 npm 、pnpm 或 yarn
npm install
```

## 使用
```
# 前台启动
node app
```
```
# 后台启动
npm run start
```
```
# 后台注销
npm run stop
```

```
# 输出日志
npm run log
```
默认监听 `0.0.0.0`:3001

服务器开放端口即可对外访问

## 接口
```
# 验证页面手动输入指定字段
[GET] /geetest

# 从url获取指定参数
[GET] /geetest?gt=xxx$chalenge=xxx

# 验证接口回调
[GET] /geetest?callback=验证码的challenge值

# 获取短链参数
1. 请求体中添加字段url发送POST请求到 /geetest 下发token
[POST] /geetest

# 短链
[GET] /geetest?e=token


```
## 手动输入
<img src="img/demo1.jpg" width="400" alt="样式1">
<img src="img/demo2.jpg" width="400" alt="样式1">
<img src="img/demo3.jpg" width="400" alt="样式1">  


### 魔改 https://github.com/Colter23/geetest-validator